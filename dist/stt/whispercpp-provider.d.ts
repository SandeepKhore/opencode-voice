/**
 * Whisper.cpp local STT provider.
 *
 * Implements the STTProvider interface by collecting microphone PCM audio,
 * packaging it as a WAV file, and invoking local `whisper-cli` (or `main`)
 * for offline, fast speech-to-text inference.
 */
import type { STTProvider, STTOptions } from "./stt-provider";
import type { STTEvent } from "./stt-events";
export declare class WhisperCppProvider implements STTProvider {
    private _isConnected;
    private listeners;
    private audioChunks;
    private options;
    private whisperPath;
    private modelPath;
    get isConnected(): boolean;
    connect(options: STTOptions): Promise<void>;
    sendAudio(audio: Buffer): Promise<void>;
    finalize(): Promise<void>;
    disconnect(): Promise<void>;
    onEvent(callback: (event: STTEvent) => void): () => void;
    private emit;
    private runWhisperCli;
}
/**
 * Creates a standard 44-byte WAV header prepended to raw PCM audio data.
 */
export declare function createWavBuffer(pcmData: Buffer, sampleRate?: number, numChannels?: number, bitsPerSample?: number): Buffer;
//# sourceMappingURL=whispercpp-provider.d.ts.map