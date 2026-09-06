/**
 * Voice Activity Detection — V2 placeholder.
 *
 * In V1, this is a simple passthrough. In V2, it will detect
 * silence and automatically finalize recording.
 *
 * The VAD sits between the Recorder and STT in the pipeline:
 *   Recorder → VAD → STT
 */
export class VAD {
    options;
    constructor(options = { enabled: false }) {
        this.options = options;
    }
    get isEnabled() {
        return this.options.enabled;
    }
    /**
     * Process an audio chunk.
     * In V1 (disabled), this is a no-op passthrough.
     */
    processChunk(_chunk) {
        if (!this.options.enabled)
            return;
        // V2: energy-based or WebRTC VAD analysis
    }
    /**
     * Register a callback for VAD events.
     * In V1, the callback is never called.
     */
    onEvent(_callback) {
        // V2: wire up speech_start / speech_end events
        return () => { };
    }
    /**
     * Reset internal state.
     */
    reset() {
        // V2: reset counters, timers, etc.
    }
}
//# sourceMappingURL=vad.js.map