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
export interface RecorderOptions {
    /** Sample rate in Hz. */
    sampleRate: number;
    /** Number of channels (1 = mono). */
    channels: number;
    /** Silence threshold (0.0 - 1.0). Set to 0 to disable silence detection. */
    threshold?: number;
}
export type AudioChunkCallback = (chunk: Buffer) => void;
export declare class Recorder {
    private recording;
    private stream;
    private onChunk;
    private _isRecording;
    get isRecording(): boolean;
    /**
     * Start recording from the microphone.
     *
     * @param options Audio capture parameters.
     * @param onChunk Callback invoked with each audio chunk.
     * @throws {MicrophoneUnavailableError} If sox/rec is not installed.
     * @throws {MicrophonePermissionError} If microphone access is denied.
     */
    start(options: RecorderOptions, onChunk: AudioChunkCallback): void;
    /**
     * Stop recording and release resources.
     * Safe to call in any state (idempotent).
     */
    stop(): void;
    private cleanup;
}
//# sourceMappingURL=recorder.d.ts.map