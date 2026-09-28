/**
 * Microphone recorder.
 *
 * Captures audio from the system microphone via node-record-lpcm16,
 * using ALSA's arecord on Linux and sox elsewhere (or as a fallback).
 * Emits audio chunks as a readable stream.
 *
 * Audio flows:
 *   Microphone → sox/arecord subprocess → PCM chunks → callback
 *
 * The recorder never accumulates full audio in memory — chunks
 * are streamed immediately to the STT provider.
 */
import record from "node-record-lpcm16";
import { accessSync, constants } from "fs";
import { delimiter, join } from "path";
import { MicrophoneUnavailableError, MicrophonePermissionError, MicrophoneDisconnectedError, } from "../errors/voice-errors";
const INSTALL_HINT = "sox is not installed. Run: brew install sox (macOS) or sudo apt-get install sox libsox-fmt-all (Ubuntu/Linux)";
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
     * @param onError Callback invoked if the recorder fails mid-stream.
     * @throws {MicrophoneUnavailableError} If no recording program is installed.
     */
    start(options, onChunk, onError) {
        if (this._isRecording) {
            this.stop();
        }
        // Check up front: a missing binary makes spawn() emit an unhandled
        // 'error' on the child process, which would crash the host.
        const recorder = pickRecorder();
        if (!recorder) {
            throw new MicrophoneUnavailableError(INSTALL_HINT);
        }
        this.onChunk = onChunk;
        try {
            this.recording = record.record({
                sampleRate: options.sampleRate,
                channels: options.channels,
                threshold: options.threshold ?? 0,
                recorder,
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
            // node-record-lpcm16 emits a string (not an Error) on non-zero exit.
            // Never throw from here — we're inside an event handler.
            stream.on("error", (err) => {
                if (!this._isRecording)
                    return;
                const message = typeof err === "string" ? err : err.message;
                const lower = message.toLowerCase();
                let error;
                if (lower.includes("permission") || lower.includes("access")) {
                    error = new MicrophonePermissionError();
                }
                else if (lower.includes("has exited with error code")) {
                    error = new MicrophoneUnavailableError(`${recorder} could not open the microphone. Check that an input device is available` +
                        (process.platform === "linux" ? " (try: arecord -l)" : "") +
                        `. Run with DEBUG=record for details.`);
                }
                else {
                    error = new MicrophoneDisconnectedError(message);
                }
                this.stop();
                onError?.(error);
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
                throw new MicrophoneUnavailableError(INSTALL_HINT);
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
/**
 * Pick the recording program.
 *
 * Linux prefers arecord (alsa-utils, preinstalled on most desktops):
 * sox's default driver there is PulseAudio, which takes ~2s to deliver
 * the first audio — long enough to swallow a short push-to-talk phrase.
 * arecord goes through ALSA and starts in well under 200ms.
 */
function pickRecorder() {
    if (process.platform === "linux" && commandExists("arecord"))
        return "arecord";
    if (commandExists("sox"))
        return "sox";
    return null;
}
function commandExists(cmd) {
    for (const dir of (process.env.PATH ?? "").split(delimiter)) {
        if (!dir)
            continue;
        try {
            accessSync(join(dir, cmd), constants.X_OK);
            return true;
        }
        catch {
            // Not in this directory
        }
    }
    return false;
}
//# sourceMappingURL=recorder.js.map