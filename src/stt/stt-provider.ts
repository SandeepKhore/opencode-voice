/**
 * Provider-independent STT interface.
 *
 * This is the abstraction boundary — VoiceController and all other
 * modules interact with STT exclusively through this interface.
 * No Deepgram/Whisper/Azure specifics leak beyond the provider
 * implementations.
 */

import type { STTEvent } from "./stt-events";

export interface STTOptions {
  /** Provider model identifier (e.g. "nova-3"). */
  readonly model: string;

  /** BCP-47 language code (e.g. "en"). */
  readonly language: string;

  /** Audio sample rate in Hz. */
  readonly sampleRate: number;

  /** Whether to receive interim (partial) transcription results. */
  readonly interimResults: boolean;

  /** Provider API key. */
  readonly apiKey: string;
}

/**
 * Speech-to-text provider contract.
 *
 * Lifecycle:
 *   1. `onEvent()` — register listener(s) before connecting
 *   2. `connect()` — establish connection to provider
 *   3. `sendAudio()` — stream audio chunks (0..N times)
 *   4. `finalize()` — signal end of audio, wait for final transcript
 *   5. `disconnect()` — clean up all resources
 *
 * Cancellation:
 *   Call `disconnect()` at any point to abort and clean up.
 */
export interface STTProvider {
  /**
   * Establish connection to the STT service.
   * Emits "connected" event on success.
   */
  connect(options: STTOptions): Promise<void>;

  /**
   * Send a chunk of audio data.
   * Must be called between `connect()` and `finalize()`.
   */
  sendAudio(audio: Buffer): Promise<void>;

  /**
   * Signal that no more audio will be sent.
   * The provider should emit a final "final" event before resolving.
   */
  finalize(): Promise<void>;

  /**
   * Disconnect and release all resources.
   * Safe to call in any state (idempotent).
   */
  disconnect(): Promise<void>;

  /**
   * Register an event listener.
   * @returns An unsubscribe function.
   */
  onEvent(callback: (event: STTEvent) => void): () => void;

  /** Whether the provider is currently connected. */
  readonly isConnected: boolean;
}
