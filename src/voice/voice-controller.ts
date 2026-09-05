/**
 * Voice controller — central orchestrator.
 *
 * Manages the state machine, coordinates recorder → STT → transcript,
 * and drives the OpenCode integration. All state transitions are
 * validated — invalid transitions throw.
 *
 * State machine:
 *   IDLE → STARTING → RECORDING → FINALIZING → READY → IDLE
 *                                             ↘ ERROR → IDLE
 *   Any active state → cancel → IDLE
 */

import type { STTProvider } from "../stt/stt-provider";
import type { STTEvent } from "../stt/stt-events";
import type { VoiceConfig } from "../config/schema";
import type { OpenCodeInput } from "../opencode/integration";
import { Recorder } from "./recorder";
import { AudioBuffer } from "./audio-buffer";
import {
  createSession,
  getFinalTranscript,
  type VoiceSession,
  type VoiceState,
} from "./voice-session";
import {
  InvalidStateTransitionError,
  VoiceError,
} from "../errors/voice-errors";

// Valid state transitions map
const VALID_TRANSITIONS: Record<VoiceState, VoiceState[]> = {
  idle: ["starting"],
  starting: ["recording", "error", "idle"],
  recording: ["finalizing", "error", "idle"],
  finalizing: ["ready", "error", "idle"],
  ready: ["idle"],
  error: ["idle"],
};

export type StateChangeCallback = (
  state: VoiceState,
  session: VoiceSession,
) => void;

export class VoiceController {
  private readonly stt: STTProvider;
  private readonly opencode: OpenCodeInput;
  private readonly config: VoiceConfig;
  private readonly recorder: Recorder;
  private readonly audioBuffer: AudioBuffer;

  private session: VoiceSession | null = null;
  private sttUnsubscribe: (() => void) | null = null;
  private stateListeners: Set<StateChangeCallback> = new Set();

  constructor(
    stt: STTProvider,
    opencode: OpenCodeInput,
    config: VoiceConfig,
  ) {
    this.stt = stt;
    this.opencode = opencode;
    this.config = config;
    this.recorder = new Recorder();
    this.audioBuffer = new AudioBuffer();
  }

  /**
   * Current state of the voice controller.
   */
  get state(): VoiceState {
    return this.session?.state ?? "idle";
  }

  /**
   * Current session (if any).
   */
  get currentSession(): VoiceSession | null {
    return this.session;
  }

  /**
   * Register a state change listener.
   * @returns Unsubscribe function.
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  /**
   * Start a new recording session.
   *
   * Flow: IDLE → STARTING → connect STT → start recorder → RECORDING
   */
  async start(): Promise<void> {
    if (this.state !== "idle") {
      // If already recording, ignore (debounce)
      if (this.state === "recording" || this.state === "starting") {
        return;
      }
      // If in error or ready state, reset first
      await this.cancel();
    }

    // Fresh session — never leak from previous recording
    this.session = createSession();
    this.audioBuffer.clear();

    this.transition("starting");

    try {
      // Subscribe to STT events before connecting
      this.sttUnsubscribe = this.stt.onEvent((event) =>
        this.handleSTTEvent(event),
      );

      // Connect to STT provider
      await this.stt.connect({
        model: this.config.stt.model,
        language: this.config.stt.language,
        sampleRate: this.config.audio.sampleRate,
        interimResults: this.config.stt.interimResults,
        apiKey: "", // Will be set by the caller via resolved config
      });

      // Start microphone capture
      this.recorder.start(
        {
          sampleRate: this.config.audio.sampleRate,
          channels: this.config.audio.channels,
        },
        (chunk) => this.handleAudioChunk(chunk),
      );

      this.transition("recording");
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * Start with a pre-resolved API key.
   * This is the primary entry point called by the plugin.
   */
  async startWithApiKey(apiKey: string): Promise<void> {
    if (this.state !== "idle") {
      if (this.state === "recording" || this.state === "starting") {
        return;
      }
      await this.cancel();
    }

    this.session = createSession();
    this.audioBuffer.clear();

    this.transition("starting");

    try {
      this.sttUnsubscribe = this.stt.onEvent((event) =>
        this.handleSTTEvent(event),
      );

      await this.stt.connect({
        model: this.config.stt.model,
        language: this.config.stt.language,
        sampleRate: this.config.audio.sampleRate,
        interimResults: this.config.stt.interimResults,
        apiKey,
        whisperPath: this.config.stt.whisperPath,
        modelPath: this.config.stt.modelPath,
      });

      this.recorder.start(
        {
          sampleRate: this.config.audio.sampleRate,
          channels: this.config.audio.channels,
        },
        (chunk) => this.handleAudioChunk(chunk),
      );

      this.transition("recording");
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * Stop recording and finalize transcript.
   *
   * Flow: RECORDING → FINALIZING → wait for final → READY → insert → IDLE
   */
  async stop(): Promise<void> {
    if (this.state !== "recording") {
      return;
    }

    if (this.session) {
      this.session.stoppedAt = Date.now();
    }

    // Stop microphone first
    this.recorder.stop();

    this.transition("finalizing");

    try {
      // Tell STT to flush and send final results
      await this.stt.finalize();

      // Build final transcript
      if (this.session) {
        this.session.finalTranscript = getFinalTranscript(this.session);
      }

      this.transition("ready");

      // Insert transcript into OpenCode prompt
      const transcript = this.session?.finalTranscript ?? "";
      if (transcript.trim()) {
        await this.opencode.insertText(transcript.trim());
      }
    } catch (err) {
      this.handleError(err);
    } finally {
      // Always clean up and return to idle
      await this.cleanup();
      if ((this.state as string) !== "idle") {
        this.transition("idle");
      }
    }
  }

  /**
   * Cancel the current recording from any active state.
   * Returns to IDLE without inserting transcript.
   */
  async cancel(): Promise<void> {
    if (this.state === "idle") return;

    this.recorder.stop();

    try {
      await this.stt.disconnect();
    } catch {
      // Swallow errors during cancellation
    }

    await this.cleanup();
    this.transition("idle");
  }

  // ── Private ────────────────────────────────────────────────

  private transition(to: VoiceState): void {
    const from = this.state;

    if (from === to) return;

    const valid = VALID_TRANSITIONS[from];
    if (!valid?.includes(to)) {
      throw new InvalidStateTransitionError(from, to);
    }

    if (this.session) {
      this.session.state = to;
    }

    for (const listener of this.stateListeners) {
      try {
        listener(to, this.session!);
      } catch {
        // Don't let bad listeners crash the controller
      }
    }
  }

  private handleAudioChunk(chunk: Buffer): void {
    if (this.state !== "recording") return;

    this.audioBuffer.push(chunk);

    // Stream chunk to STT immediately
    this.stt.sendAudio(chunk).catch((err) => {
      this.handleError(err);
    });
  }

  private handleSTTEvent(event: STTEvent): void {
    if (!this.session) return;

    switch (event.type) {
      case "partial":
        // Replace interim — don't append
        this.session.partialTranscript = event.text;
        this.notifyStateListeners();
        break;

      case "final":
        // Move to confirmed parts, clear interim
        if (event.text.trim()) {
          this.session.finalParts.push(event.text.trim());
        }
        this.session.partialTranscript = "";
        this.notifyStateListeners();
        break;

      case "error":
        this.handleError(event.error);
        break;

      case "connected":
      case "disconnected":
        // Handled by state machine flow
        break;
    }
  }

  private handleError(err: unknown): void {
    if (!this.session) return;

    const voiceError =
      err instanceof VoiceError
        ? err
        : new VoiceError(
            "UNKNOWN",
            err instanceof Error ? err.message : String(err),
          );

    this.session.error = voiceError;

    try {
      this.transition("error");
    } catch {
      // If transition fails (already in error), just set state directly
      if (this.session) {
        this.session.state = "error";
      }
    }

    // Clean up after error
    this.recorder.stop();
    this.stt.disconnect().catch(() => {});
    this.cleanup().catch(() => {});
  }

  private notifyStateListeners(): void {
    if (!this.session) return;
    for (const listener of this.stateListeners) {
      try {
        listener(this.session.state, this.session);
      } catch {
        // Swallow
      }
    }
  }

  private async cleanup(): Promise<void> {
    // Unsubscribe from STT events
    if (this.sttUnsubscribe) {
      this.sttUnsubscribe();
      this.sttUnsubscribe = null;
    }

    // Zero out audio buffer (security)
    this.audioBuffer.clear();

    // Disconnect STT if still connected
    if (this.stt.isConnected) {
      try {
        await this.stt.disconnect();
      } catch {
        // Swallow
      }
    }
  }
}
