/**
 * Voice controller — central orchestrator.
 *
 * Manages the state machine, coordinates recorder → STT → transcript,
 * and drives the OpenCode integration. All state transitions are
 * validated — invalid transitions throw.
 *
 * State machine:
 *   IDLE → STARTING → RECORDING → FINALIZING → READY → IDLE
 *                                             ↘ ERROR → IDLE
 *   Any active state → cancel → IDLE
 */
import { Recorder } from "./recorder";
import { AudioBuffer } from "./audio-buffer";
import { createSession, getFinalTranscript, } from "./voice-session";
import { InvalidStateTransitionError, VoiceError, } from "../errors/voice-errors";
// Valid state transitions map
const VALID_TRANSITIONS = {
    idle: ["starting"],
    starting: ["recording", "error", "idle"],
    recording: ["finalizing", "error", "idle"],
    finalizing: ["ready", "error", "idle"],
    ready: ["idle"],
    error: ["idle"],
};
export class VoiceController {
    stt;
    opencode;
    config;
    recorder;
    audioBuffer;
    session = null;
    sttUnsubscribe = null;
    stateListeners = new Set();
    constructor(stt, opencode, config) {
        this.stt = stt;
        this.opencode = opencode;
        this.config = config;
        this.recorder = new Recorder();
        this.audioBuffer = new AudioBuffer();
    }
    /**
     * Current state of the voice controller.
     */
    get state() {
        return this.session?.state ?? "idle";
    }
    /**
     * Current session (if any).
     */
    get currentSession() {
        return this.session;
    }
    /**
     * Register a state change listener.
     * @returns Unsubscribe function.
     */
    onStateChange(callback) {
        this.stateListeners.add(callback);
        return () => {
            this.stateListeners.delete(callback);
        };
    }
    /**
     * Start a new recording session.
     *
     * Flow: IDLE → STARTING → connect STT → start recorder → RECORDING
     */
    async start() {
        if (this.state !== "idle") {
            // If already recording, ignore (debounce)
            if (this.state === "recording" || this.state === "starting") {
                return;
            }
            // If in error or ready state, reset first
            await this.cancel();
        }
        // Fresh session — never leak from previous recording
        this.session = createSession();
        this.audioBuffer.clear();
        this.transition("starting");
        try {
            // Subscribe to STT events before connecting
            this.sttUnsubscribe = this.stt.onEvent((event) => this.handleSTTEvent(event));
            // Connect to STT provider
            await this.stt.connect({
                model: this.config.stt.model,
                language: this.config.stt.language,
                sampleRate: this.config.audio.sampleRate,
                interimResults: this.config.stt.interimResults,
                apiKey: "", // Will be set by the caller via resolved config
            });
            // Start microphone capture
            this.recorder.start({
                sampleRate: this.config.audio.sampleRate,
                channels: this.config.audio.channels,
            }, (chunk) => this.handleAudioChunk(chunk));
            this.transition("recording");
        }
        catch (err) {
            this.handleError(err);
        }
    }
    /**
     * Start with a pre-resolved API key.
     * This is the primary entry point called by the plugin.
     */
    async startWithApiKey(apiKey) {
        if (this.state !== "idle") {
            if (this.state === "recording" || this.state === "starting") {
                return;
            }
            await this.cancel();
        }
        this.session = createSession();
        this.audioBuffer.clear();
        this.transition("starting");
        try {
            this.sttUnsubscribe = this.stt.onEvent((event) => this.handleSTTEvent(event));
            await this.stt.connect({
                model: this.config.stt.model,
                language: this.config.stt.language,
                sampleRate: this.config.audio.sampleRate,
                interimResults: this.config.stt.interimResults,
                apiKey,
                whisperPath: this.config.stt.whisperPath,
                modelPath: this.config.stt.modelPath,
            });
            this.recorder.start({
                sampleRate: this.config.audio.sampleRate,
                channels: this.config.audio.channels,
            }, (chunk) => this.handleAudioChunk(chunk));
            this.transition("recording");
        }
        catch (err) {
            this.handleError(err);
        }
    }
    /**
     * Toggle recording state.
     * - If idle, starts recording.
     * - If recording, stops and finalizes.
     * - If starting or finalizing, cancels.
     */
    async toggle(apiKey = "") {
        if (this.state === "idle") {
            await this.startWithApiKey(apiKey);
        }
        else if (this.state === "recording") {
            await this.stop();
        }
        else {
            await this.cancel();
        }
    }
    /**
     * Stop recording and finalize transcript.
     *
     * Flow: RECORDING → FINALIZING → wait for final → READY → insert → IDLE
     */
    async stop() {
        if (this.state !== "recording") {
            return;
        }
        if (this.session) {
            this.session.stoppedAt = Date.now();
        }
        // Stop microphone first
        this.recorder.stop();
        this.transition("finalizing");
        try {
            // Tell STT to flush and send final results
            await this.stt.finalize();
            // Build final transcript
            if (this.session) {
                this.session.finalTranscript = getFinalTranscript(this.session);
            }
            this.transition("ready");
            // Insert transcript into OpenCode prompt
            const transcript = this.session?.finalTranscript ?? "";
            if (transcript.trim()) {
                await this.opencode.insertText(transcript.trim());
            }
        }
        catch (err) {
            this.handleError(err);
        }
        finally {
            // Always clean up and return to idle
            await this.cleanup();
            if (this.state !== "idle") {
                this.transition("idle");
            }
        }
    }
    /**
     * Cancel the current recording from any active state.
     * Returns to IDLE without inserting transcript.
     */
    async cancel() {
        if (this.state === "idle")
            return;
        this.recorder.stop();
        try {
            await this.stt.disconnect();
        }
        catch {
            // Swallow errors during cancellation
        }
        await this.cleanup();
        this.transition("idle");
    }
    // ── Private ────────────────────────────────────────────────
    transition(to) {
        const from = this.state;
        if (from === to)
            return;
        const valid = VALID_TRANSITIONS[from];
        if (!valid?.includes(to)) {
            throw new InvalidStateTransitionError(from, to);
        }
        if (this.session) {
            this.session.state = to;
        }
        for (const listener of this.stateListeners) {
            try {
                listener(to, this.session);
            }
            catch {
                // Don't let bad listeners crash the controller
            }
        }
    }
    handleAudioChunk(chunk) {
        if (this.state !== "recording")
            return;
        this.audioBuffer.push(chunk);
        // Stream chunk to STT immediately
        this.stt.sendAudio(chunk).catch((err) => {
            this.handleError(err);
        });
    }
    handleSTTEvent(event) {
        if (!this.session)
            return;
        switch (event.type) {
            case "partial":
                // Replace interim — don't append
                this.session.partialTranscript = event.text;
                this.notifyStateListeners();
                break;
            case "final":
                // Move to confirmed parts, clear interim
                if (event.text.trim()) {
                    this.session.finalParts.push(event.text.trim());
                }
                this.session.partialTranscript = "";
                this.notifyStateListeners();
                break;
            case "error":
                this.handleError(event.error);
                break;
            case "connected":
            case "disconnected":
                // Handled by state machine flow
                break;
        }
    }
    handleError(err) {
        if (!this.session)
            return;
        const voiceError = err instanceof VoiceError
            ? err
            : new VoiceError("UNKNOWN", err instanceof Error ? err.message : String(err));
        this.session.error = voiceError;
        try {
            this.transition("error");
        }
        catch {
            // If transition fails (already in error), just set state directly
            if (this.session) {
                this.session.state = "error";
            }
        }
        // Clean up after error
        this.recorder.stop();
        this.stt.disconnect().catch(() => { });
        this.cleanup().catch(() => { });
    }
    notifyStateListeners() {
        if (!this.session)
            return;
        for (const listener of this.stateListeners) {
            try {
                listener(this.session.state, this.session);
            }
            catch {
                // Swallow
            }
        }
    }
    async cleanup() {
        // Unsubscribe from STT events
        if (this.sttUnsubscribe) {
            this.sttUnsubscribe();
            this.sttUnsubscribe = null;
        }
        // Zero out audio buffer (security)
        this.audioBuffer.clear();
        // Disconnect STT if still connected
        if (this.stt.isConnected) {
            try {
                await this.stt.disconnect();
            }
            catch {
                // Swallow
            }
        }
    }
}
//# sourceMappingURL=voice-controller.js.map