/**
 * Deepgram streaming STT provider.
 *
 * Implements the STTProvider interface using @deepgram/sdk
 * live transcription WebSocket API. Handles connection lifecycle,
 * event mapping, and reconnection with exponential backoff.
 */
import { DeepgramClient } from "@deepgram/sdk";
import { STTAuthenticationError, STTConnectionError, STTTimeoutError, } from "../errors/voice-errors";
const FINALIZE_TIMEOUT_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 500;
export class DeepgramProvider {
    client = null;
    connection = null;
    listeners = new Set();
    _isConnected = false;
    finalizeResolver = null;
    finalizeTimer = null;
    get isConnected() {
        return this._isConnected;
    }
    async connect(options) {
        if (this._isConnected) {
            await this.disconnect();
        }
        if (!options.apiKey) {
            throw new STTAuthenticationError();
        }
        this.client = new DeepgramClient({ apiKey: options.apiKey });
        let attempts = 0;
        while (attempts < MAX_RECONNECT_ATTEMPTS) {
            try {
                await this.attemptConnection(options);
                return;
            }
            catch (err) {
                attempts++;
                if (attempts >= MAX_RECONNECT_ATTEMPTS) {
                    throw err instanceof STTConnectionError
                        ? err
                        : new STTConnectionError(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts: ${String(err)}`);
                }
                const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempts - 1);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }
    async sendAudio(audio) {
        if (!this.connection || !this._isConnected) {
            throw new STTConnectionError("Cannot send audio: not connected");
        }
        this.connection.send(audio);
    }
    async finalize() {
        if (!this.connection || !this._isConnected) {
            return;
        }
        // Request the server to flush and send final results
        return new Promise((resolve, reject) => {
            this.finalizeResolver = resolve;
            this.finalizeTimer = setTimeout(() => {
                this.finalizeResolver = null;
                reject(new STTTimeoutError("Finalization timed out"));
            }, FINALIZE_TIMEOUT_MS);
            // Send close message to request final transcript
            try {
                if (typeof this.connection?.requestClose === "function") {
                    this.connection.requestClose();
                }
                else if (typeof this.connection?.finish === "function") {
                    this.connection.finish();
                }
                else if (typeof this.connection?.close === "function") {
                    this.connection.close();
                }
                else {
                    if (this.finalizeTimer)
                        clearTimeout(this.finalizeTimer);
                    this.finalizeResolver = null;
                    resolve();
                }
            }
            catch {
                // If close fails, resolve anyway — we'll get what we have
                if (this.finalizeTimer)
                    clearTimeout(this.finalizeTimer);
                this.finalizeResolver = null;
                resolve();
            }
        });
    }
    async disconnect() {
        if (this.finalizeTimer) {
            clearTimeout(this.finalizeTimer);
            this.finalizeTimer = null;
        }
        if (this.finalizeResolver) {
            this.finalizeResolver();
            this.finalizeResolver = null;
        }
        if (this.connection) {
            try {
                if (typeof this.connection.removeAllListeners === "function") {
                    this.connection.removeAllListeners();
                }
                if (typeof this.connection.requestClose === "function") {
                    this.connection.requestClose();
                }
                else if (typeof this.connection.close === "function") {
                    this.connection.close();
                }
            }
            catch {
                // Swallow errors during cleanup
            }
            this.connection = null;
        }
        this.client = null;
        this._isConnected = false;
    }
    onEvent(callback) {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }
    // ── Private ────────────────────────────────────────────────
    emit(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch {
                // Don't let a bad listener crash the provider
            }
        }
    }
    async attemptConnection(options) {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new STTConnectionError("Client not initialized"));
                return;
            }
            const clientListen = this.client.listen;
            const connection = clientListen.v1
                ? clientListen.v1.connect({
                    model: options.model,
                    language: options.language,
                    punctuate: true,
                    interim_results: options.interimResults,
                    sample_rate: options.sampleRate,
                    channels: 1,
                    encoding: "linear16",
                    endpointing: 300,
                })
                : clientListen.live({
                    model: options.model,
                    language: options.language,
                    punctuate: true,
                    interim_results: options.interimResults,
                    sample_rate: options.sampleRate,
                    channels: 1,
                    encoding: "linear16",
                    endpointing: 300,
                });
            const timeout = setTimeout(() => {
                reject(new STTTimeoutError("Connection timed out"));
            }, 10_000);
            if (typeof connection.on === "function") {
                connection.on("open", () => {
                    clearTimeout(timeout);
                    this.connection = connection;
                    this._isConnected = true;
                    this.emit({ type: "connected" });
                    resolve();
                });
                connection.on("Results", (data) => {
                    this.handleTranscriptionResult(data);
                });
                connection.on("error", (err) => {
                    const error = err instanceof Error ? err : new Error(String(err));
                    this.emit({ type: "error", error });
                });
                connection.on("close", () => {
                    this._isConnected = false;
                    this.emit({ type: "disconnected" });
                    // Resolve finalize if pending
                    if (this.finalizeResolver) {
                        if (this.finalizeTimer)
                            clearTimeout(this.finalizeTimer);
                        this.finalizeResolver();
                        this.finalizeResolver = null;
                        this.finalizeTimer = null;
                    }
                });
            }
            else {
                clearTimeout(timeout);
                this.connection = connection;
                this._isConnected = true;
                this.emit({ type: "connected" });
                resolve();
            }
        });
    }
    handleTranscriptionResult(data) {
        const result = data;
        const transcript = result?.channel?.alternatives?.[0]?.transcript ?? "";
        if (!transcript)
            return;
        if (result.is_final) {
            this.emit({ type: "final", text: transcript });
        }
        else {
            this.emit({ type: "partial", text: transcript });
        }
    }
}
//# sourceMappingURL=deepgram-provider.js.map