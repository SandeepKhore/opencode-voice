/**
 * Whisper.cpp local STT provider.
 *
 * Implements the STTProvider interface by collecting microphone PCM audio,
 * packaging it as a WAV file, and invoking local `whisper-cli` (or `main`)
 * for offline, fast speech-to-text inference.
 */

import { execFile } from "child_process";
import { unlink, writeFile, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { STTProvider, STTOptions } from "./stt-provider";
import type { STTEvent } from "./stt-events";
import {
  STTConnectionError,
  STTTimeoutError,
} from "../errors/voice-errors";

const INFERENCE_TIMEOUT_MS = 60_000;

export class WhisperCppProvider implements STTProvider {
  private _isConnected = false;
  private listeners: Set<(event: STTEvent) => void> = new Set();
  private audioChunks: Buffer[] = [];
  private options: STTOptions | null = null;
  private whisperPath = "whisper-cli";
  private modelPath = "models/ggml-base.en.bin";

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(options: STTOptions): Promise<void> {
    this.options = options;
    this.audioChunks = [];
    this.whisperPath = options.whisperPath || process.env.WHISPER_PATH || "whisper-cli";
    this.modelPath = options.modelPath || process.env.WHISPER_MODEL_PATH || "models/ggml-base.en.bin";
    this._isConnected = true;
    this.emit({ type: "connected" });
  }

  async sendAudio(audio: Buffer): Promise<void> {
    if (!this._isConnected) {
      throw new STTConnectionError("Cannot send audio: not connected");
    }
    this.audioChunks.push(audio);
  }

  async finalize(): Promise<void> {
    if (!this._isConnected) return;

    if (this.audioChunks.length === 0) {
      this.emit({ type: "final", text: "" });
      return;
    }

    const pcmData = Buffer.concat(this.audioChunks);
    this.audioChunks = []; // Clear buffer

    const sampleRate = this.options?.sampleRate ?? 16000;
    const wavBuffer = createWavBuffer(pcmData, sampleRate, 1, 16);

    let tempDir = "";
    let tempWavPath = "";

    try {
      tempDir = await mkdtemp(join(tmpdir(), "whisper-opencode-"));
      tempWavPath = join(tempDir, "input.wav");
      await writeFile(tempWavPath, wavBuffer);

      const transcript = await this.runWhisperCli(tempWavPath);
      this.emit({ type: "final", text: transcript.trim() });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit({ type: "error", error });
      throw error;
    } finally {
      if (tempWavPath) {
        await unlink(tempWavPath).catch(() => {});
      }
    }
  }

  async disconnect(): Promise<void> {
    this.audioChunks = [];
    this._isConnected = false;
    this.emit({ type: "disconnected" });
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
        // Don't crash provider on bad listener
      }
    }
  }

  private runWhisperCli(wavPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "-m",
        this.modelPath,
        "-f",
        wavPath,
        "-nt", // no timestamps
        "-otxt", // output text
      ];

      if (this.options?.language) {
        args.push("-l", this.options.language);
      }

      const proc = execFile(
        this.whisperPath,
        args,
        { timeout: INFERENCE_TIMEOUT_MS },
        (error, stdout, stderr) => {
          if (error) {
            const msg = stderr || stdout || error.message;
            if (msg.includes("ENOENT") || error.code === "ENOENT") {
              reject(
                new STTConnectionError(
                  `whisper-cli binary not found at "${this.whisperPath}". Install whisper.cpp or set WHISPER_PATH.`,
                ),
              );
            } else if (error.killed) {
              reject(new STTTimeoutError("Whisper.cpp inference timed out"));
            } else {
              reject(new STTConnectionError(`Whisper.cpp failed: ${msg}`));
            }
            return;
          }

          // Return stdout transcript text
          resolve(stdout.trim());
        },
      );

      proc.on("error", (err) => {
        if ((err as any).code === "ENOENT") {
          reject(
            new STTConnectionError(
              `whisper-cli binary not found at "${this.whisperPath}". Install whisper.cpp or set WHISPER_PATH.`,
            ),
          );
        } else {
          reject(new STTConnectionError(`Whisper.cpp spawn error: ${err.message}`));
        }
      });
    });
  }
}

/**
 * Creates a standard 44-byte WAV header prepended to raw PCM audio data.
 */
export function createWavBuffer(
  pcmData: Buffer,
  sampleRate = 16000,
  numChannels = 1,
  bitsPerSample = 16,
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);

  // fmt subchunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}
