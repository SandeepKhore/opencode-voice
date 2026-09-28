/**
 * Microphone recorder.
 *
 * Captures audio from the system microphone using sox via
 * node-record-lpcm16 (falling back to ALSA's arecord on Linux when
 * sox is not installed). Emits audio chunks as a readable stream.
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
import type { Readable } from "stream";
import {
  MicrophoneUnavailableError,
  MicrophonePermissionError,
  MicrophoneDisconnectedError,
} from "../errors/voice-errors";

export interface RecorderOptions {
  /** Sample rate in Hz. */
  sampleRate: number;

  /** Number of channels (1 = mono). */
  channels: number;

  /** Silence threshold (0.0 - 1.0). Set to 0 to disable silence detection. */
  threshold?: number;
}

export type AudioChunkCallback = (chunk: Buffer) => void;

/** Invoked when the recorder fails after start() has returned. */
export type RecorderErrorCallback = (error: Error) => void;

const INSTALL_HINT =
  "sox is not installed. Run: brew install sox (macOS) or sudo apt-get install sox libsox-fmt-all (Ubuntu/Linux)";

export class Recorder {
  private recording: ReturnType<typeof record.record> | null = null;
  private stream: Readable | null = null;
  private onChunk: AudioChunkCallback | null = null;
  private _isRecording = false;

  get isRecording(): boolean {
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
  start(
    options: RecorderOptions,
    onChunk: AudioChunkCallback,
    onError?: RecorderErrorCallback,
  ): void {
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

      stream.on("data", (chunk: Buffer | string) => {
        if (this._isRecording && this.onChunk) {
          const buf = typeof chunk === "string" ? Buffer.from(chunk, "binary") : chunk;
          this.onChunk(buf);
        }
      });

      // node-record-lpcm16 emits a string (not an Error) on non-zero exit.
      // Never throw from here — we're inside an event handler.
      stream.on("error", (err: Error | string) => {
        if (!this._isRecording) return;
        const message = typeof err === "string" ? err : err.message;
        const lower = message.toLowerCase();

        let error: Error;
        if (lower.includes("permission") || lower.includes("access")) {
          error = new MicrophonePermissionError();
        } else if (lower.includes("has exited with error code")) {
          error = new MicrophoneUnavailableError(
            `${recorder} could not open the microphone. Check that an input device is available` +
              (process.platform === "linux" ? " (try: arecord -l, or install libsox-fmt-pulse)" : "") +
              `. Run with DEBUG=record for details.`,
          );
        } else {
          error = new MicrophoneDisconnectedError(message);
        }

        this.stop();
        onError?.(error);
      });

      stream.on("end", () => {
        this._isRecording = false;
      });

      this._isRecording = true;
    } catch (err) {
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
  stop(): void {
    this._isRecording = false;

    if (this.recording) {
      try {
        this.recording.stop();
      } catch {
        // Swallow errors during stop — subprocess may have already exited
      }
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.removeAllListeners();
      try {
        this.stream.destroy();
      } catch {
        // Swallow
      }
      this.stream = null;
    }

    this.recording = null;
    this.onChunk = null;
  }
}

/**
 * Pick the recording program: sox everywhere, arecord (alsa-utils,
 * preinstalled on most Linux desktops) as a Linux fallback.
 */
function pickRecorder(): "sox" | "arecord" | null {
  if (commandExists("sox")) return "sox";
  if (process.platform === "linux" && commandExists("arecord")) return "arecord";
  return null;
}

function commandExists(cmd: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    try {
      accessSync(join(dir, cmd), constants.X_OK);
      return true;
    } catch {
      // Not in this directory
    }
  }
  return false;
}
