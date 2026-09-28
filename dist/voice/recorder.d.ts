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
     * @param onError Callback invoked if the recorder fails mid-stream.
     * @throws {MicrophoneUnavailableError} If no recording program is installed.
     */
    start(options: RecorderOptions, onChunk: AudioChunkCallback, onError?: RecorderErrorCallback): void;
    /**
     * Stop recording and release resources.
     * Safe to call in any state (idempotent).
     */
    stop(): void;
    private cleanup;
}
//# sourceMappingURL=recorder.d.ts.map