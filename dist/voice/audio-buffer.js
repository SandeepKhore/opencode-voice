/**
 * Bounded audio buffer.
 *
 * Ring buffer that drops oldest chunks when full.
 * Prevents unbounded memory accumulation during recording.
 */
const DEFAULT_MAX_BYTES = 960_000; // ~30s at 16kHz mono 16-bit
export class AudioBuffer {
    chunks = [];
    totalBytes = 0;
    maxBytes;
    constructor(maxBytes = DEFAULT_MAX_BYTES) {
        this.maxBytes = maxBytes;
    }
    /**
     * Add an audio chunk.
     * Drops oldest chunks if the buffer would exceed maxBytes.
     */
    push(chunk) {
        this.chunks.push(chunk);
        this.totalBytes += chunk.byteLength;
        // Drop oldest chunks to stay within bounds
        while (this.totalBytes > this.maxBytes && this.chunks.length > 1) {
            const dropped = this.chunks.shift();
            this.totalBytes -= dropped.byteLength;
        }
    }
    /**
     * Get all buffered chunks (without clearing).
     */
    getAll() {
        return [...this.chunks];
    }
    /**
     * Current buffer size in bytes.
     */
    get size() {
        return this.totalBytes;
    }
    /**
     * Number of chunks in the buffer.
     */
    get length() {
        return this.chunks.length;
    }
    /**
     * Clear all chunks and zero out memory.
     * Important for security — audio data is sensitive.
     */
    clear() {
        for (const chunk of this.chunks) {
            chunk.fill(0);
        }
        this.chunks = [];
        this.totalBytes = 0;
    }
}
//# sourceMappingURL=audio-buffer.js.map