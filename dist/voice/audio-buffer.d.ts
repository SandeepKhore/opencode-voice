/**
 * Bounded audio buffer.
 *
 * Ring buffer that drops oldest chunks when full.
 * Prevents unbounded memory accumulation during recording.
 */
export declare class AudioBuffer {
    private chunks;
    private totalBytes;
    private readonly maxBytes;
    constructor(maxBytes?: number);
    /**
     * Add an audio chunk.
     * Drops oldest chunks if the buffer would exceed maxBytes.
     */
    push(chunk: Buffer): void;
    /**
     * Get all buffered chunks (without clearing).
     */
    getAll(): Buffer[];
    /**
     * Current buffer size in bytes.
     */
    get size(): number;
    /**
     * Number of chunks in the buffer.
     */
    get length(): number;
    /**
     * Clear all chunks and zero out memory.
     * Important for security — audio data is sensitive.
     */
    clear(): void;
}
//# sourceMappingURL=audio-buffer.d.ts.map