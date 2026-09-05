/**
 * Voice session.
 *
 * Each recording creates a unique session. Sessions must never leak
 * state into the next recording.
 */

import type { VoiceError } from "../errors/voice-errors";

export type VoiceState =
  | "idle"
  | "starting"
  | "recording"
  | "finalizing"
  | "ready"
  | "error";

export interface VoiceSession {
  /** Unique session identifier. */
  readonly id: string;

  /** Timestamp when recording started (ms since epoch). */
  readonly startedAt: number;

  /** Timestamp when recording stopped. */
  stoppedAt?: number;

  /** Current state. */
  state: VoiceState;

  /** Accumulated confirmed (final) transcript parts. */
  finalParts: string[];

  /** Current interim transcript (replaced on each partial event). */
  partialTranscript: string;

  /** The complete final transcript after finalization. */
  finalTranscript?: string;

  /** Error, if the session is in error state. */
  error?: VoiceError;
}

let sessionCounter = 0;

/**
 * Create a new voice session with a unique ID.
 */
export function createSession(): VoiceSession {
  sessionCounter++;
  return {
    id: `voice-${Date.now()}-${sessionCounter}`,
    startedAt: Date.now(),
    state: "idle",
    finalParts: [],
    partialTranscript: "",
  };
}

/**
 * Get the full display transcript from a session.
 * Uses the replacement model: confirmed parts + current interim.
 */
export function getDisplayTranscript(session: VoiceSession): string {
  const confirmed = session.finalParts.join(" ");
  if (session.partialTranscript) {
    return confirmed
      ? `${confirmed} ${session.partialTranscript}`
      : session.partialTranscript;
  }
  return confirmed;
}

/**
 * Get the final transcript from a completed session.
 */
export function getFinalTranscript(session: VoiceSession): string {
  return session.finalTranscript ?? session.finalParts.join(" ");
}
