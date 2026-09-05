/**
 * Voice Activity Detection — V2 placeholder.
 *
 * In V1, this is a simple passthrough. In V2, it will detect
 * silence and automatically finalize recording.
 *
 * The VAD sits between the Recorder and STT in the pipeline:
 *   Recorder → VAD → STT
 */

export interface VADOptions {
  /** Whether VAD is enabled. */
  enabled: boolean;

  /** Silence duration (ms) before auto-finalize. */
  silenceDurationMs?: number;

  /** Energy threshold for speech detection (0.0 - 1.0). */
  threshold?: number;
}

export type VADCallback = (event: "speech_start" | "speech_end") => void;

export class VAD {
  private readonly options: VADOptions;

  constructor(options: VADOptions = { enabled: false }) {
    this.options = options;
  }

  get isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Process an audio chunk.
   * In V1 (disabled), this is a no-op passthrough.
   */
  processChunk(_chunk: Buffer): void {
    if (!this.options.enabled) return;
    // V2: energy-based or WebRTC VAD analysis
  }

  /**
   * Register a callback for VAD events.
   * In V1, the callback is never called.
   */
  onEvent(_callback: VADCallback): () => void {
    // V2: wire up speech_start / speech_end events
    return () => {};
  }

  /**
   * Reset internal state.
   */
  reset(): void {
    // V2: reset counters, timers, etc.
  }
}
