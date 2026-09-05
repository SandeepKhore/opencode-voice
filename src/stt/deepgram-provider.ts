/**
 * Deepgram streaming STT provider.
 *
 * Implements the STTProvider interface using @deepgram/sdk
 * live transcription WebSocket API. Handles connection lifecycle,
 * event mapping, and reconnection with exponential backoff.
 */

import { DeepgramClient } from "@deepgram/sdk";
import type { STTProvider, STTOptions } from "./stt-provider";
import type { STTEvent } from "./stt-events";
import {
  STTAuthenticationError,
  STTConnectionError,
  STTTimeoutError,
} from "../errors/voice-errors";

const FINALIZE_TIMEOUT_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 500;

export interface LiveConnectionLike {
  send(data: Buffer | ArrayBufferLike): void;
  finish?(): void;
  close?(): void;
  requestClose?(): void;
  removeAllListeners?(): void;
  on?(event: string, listener: (...args: any[]) => void): void;
}

export class DeepgramProvider implements STTProvider {
  private client: DeepgramClient | null = null;
  private connection: LiveConnectionLike | null = null;
  private listeners: Set<(event: STTEvent) => void> = new Set();
  private _isConnected = false;
  private finalizeResolver: (() => void) | null = null;
  private finalizeTimer: ReturnType<typeof setTimeout> | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(options: STTOptions): Promise<void> {
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
      } catch (err) {
        attempts++;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          throw err instanceof STTConnectionError
            ? err
            : new STTConnectionError(
                `Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts: ${String(err)}`,
              );
        }
        const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempts - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  async sendAudio(audio: Buffer): Promise<void> {
    if (!this.connection || !this._isConnected) {
      throw new STTConnectionError("Cannot send audio: not connected");
    }

    this.connection.send(audio);
  }

  async finalize(): Promise<void> {
    if (!this.connection || !this._isConnected) {
      return;
    }

    // Request the server to flush and send final results
    return new Promise<void>((resolve, reject) => {
      this.finalizeResolver = resolve;

      this.finalizeTimer = setTimeout(() => {
        this.finalizeResolver = null;
        reject(new STTTimeoutError("Finalization timed out"));
      }, FINALIZE_TIMEOUT_MS);

      // Send close message to request final transcript
      try {
        if (typeof this.connection?.requestClose === "function") {
          this.connection.requestClose();
        } else if (typeof this.connection?.finish === "function") {
          this.connection.finish();
        } else if (typeof this.connection?.close === "function") {
          this.connection.close();
        } else {
          if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
          this.finalizeResolver = null;
          resolve();
        }
      } catch {
        // If close fails, resolve anyway — we'll get what we have
        if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
        this.finalizeResolver = null;
        resolve();
      }
    });
  }

  async disconnect(): Promise<void> {
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
        } else if (typeof this.connection.close === "function") {
          this.connection.close();
        }
      } catch {
        // Swallow errors during cleanup
      }
      this.connection = null;
    }

    this.client = null;
    this._isConnected = false;
  }

  onEvent(callback: (event: STTEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // ── Private ────────────────────────────────────────────────

  private emit(event: STTEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let a bad listener crash the provider
      }
    }
  }

  private async attemptConnection(options: STTOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.client) {
        reject(new STTConnectionError("Client not initialized"));
        return;
      }

      const clientListen = (this.client as any).listen;
      const connection: LiveConnectionLike = clientListen.v1
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

        connection.on("Results", (data: unknown) => {
          this.handleTranscriptionResult(data);
        });

        connection.on("error", (err: unknown) => {
          const error =
            err instanceof Error ? err : new Error(String(err));
          this.emit({ type: "error", error });
        });

        connection.on("close", () => {
          this._isConnected = false;
          this.emit({ type: "disconnected" });

          // Resolve finalize if pending
          if (this.finalizeResolver) {
            if (this.finalizeTimer) clearTimeout(this.finalizeTimer);
            this.finalizeResolver();
            this.finalizeResolver = null;
            this.finalizeTimer = null;
          }
        });
      } else {
        clearTimeout(timeout);
        this.connection = connection;
        this._isConnected = true;
        this.emit({ type: "connected" });
        resolve();
      }
    });
  }

  private handleTranscriptionResult(data: unknown): void {
    const result = data as {
      is_final?: boolean;
      speech_final?: boolean;
      channel?: {
        alternatives?: Array<{ transcript?: string }>;
      };
    };

    const transcript =
      result?.channel?.alternatives?.[0]?.transcript ?? "";

    if (!transcript) return;

    if (result.is_final) {
      this.emit({ type: "final", text: transcript });
    } else {
      this.emit({ type: "partial", text: transcript });
    }
  }
}
