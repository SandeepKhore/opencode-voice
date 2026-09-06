/**
 * Microphone recorder.
 *
 * Captures audio from the system microphone using sox/rec via
 * node-record-lpcm16. Emits audio chunks as a readable stream.
 *
 * Audio flows:
 *   Microphone → sox subprocess → PCM chunks → callback
 *
 * The recorder never accumulates full audio in memory — chunks
 * are streamed immediately to the STT provider.
 */
import record from "node-record-lpcm16";
import { MicrophoneUnavailableError, MicrophonePermissionError, MicrophoneDisconnectedError, } from "../errors/voice-errors";
export class Recorder {
    recording = null;
    stream = null;
    onChunk = null;
    _isRecording = false;
    get isRecording() {
        return this._isRecording;
    }
    /**
     * Start recording from the microphone.
     *
     * @param options Audio capture parameters.
     * @param onChunk Callback invoked with each audio chunk.
     * @throws {MicrophoneUnavailableError} If sox/rec is not installed.
     * @throws {MicrophonePermissionError} If microphone access is denied.
     */
    start(options, onChunk) {
        if (this._isRecording) {
            this.stop();
        }
        this.onChunk = onChunk;
        try {
            this.recording = record.record({
                sampleRate: options.sampleRate,
                channels: options.channels,
                threshold: options.threshold ?? 0,
                recordProgram: "sox",
                silence: "0",
            });
            const stream = this.recording.stream();
            this.stream = stream;
            stream.on("data", (chunk) => {
                if (this._isRecording && this.onChunk) {
                    const buf = typeof chunk === "string" ? Buffer.from(chunk, "binary") : chunk;
                    this.onChunk(buf);
                }
            });
            stream.on("error", (err) => {
                const message = err.message.toLowerCase();
                if (message.includes("permission") || message.includes("access")) {
                    throw new MicrophonePermissionError();
                }
                if (message.includes("not found") || message.includes("sox")) {
                    throw new MicrophoneUnavailableError("sox is not installed. Run: brew install sox (macOS) or sudo apt-get install sox libsox-fmt-all (Ubuntu/Linux)");
                }
                throw new MicrophoneDisconnectedError(err.message);
            });
            stream.on("end", () => {
                this._isRecording = false;
            });
            this._isRecording = true;
        }
        catch (err) {
            this.cleanup();
            if (err instanceof MicrophoneUnavailableError ||
                err instanceof MicrophonePermissionError) {
                throw err;
            }
            const message = String(err);
            if (message.includes("sox") || message.includes("not found") || message.includes("ENOENT")) {
                throw new MicrophoneUnavailableError("sox is not installed. Run: brew install sox (macOS) or sudo apt-get install sox libsox-fmt-all (Ubuntu/Linux)");
            }
            throw new MicrophoneUnavailableError(message);
        }
    }
    /**
     * Stop recording and release resources.
     * Safe to call in any state (idempotent).
     */
    stop() {
        this._isRecording = false;
        if (this.recording) {
            try {
                this.recording.stop();
            }
            catch {
                // Swallow errors during stop — subprocess may have already exited
            }
        }
        this.cleanup();
    }
    cleanup() {
        if (this.stream) {
            this.stream.removeAllListeners();
            try {
                this.stream.destroy();
            }
            catch {
                // Swallow
            }
            this.stream = null;
        }
        this.recording = null;
        this.onChunk = null;
    }
}
//# sourceMappingURL=recorder.js.map