/**
 * Voice session.
 *
 * Each recording creates a unique session. Sessions must never leak
 * state into the next recording.
 */
import type { VoiceError } from "../errors/voice-errors";
export type VoiceState = "idle" | "starting" | "recording" | "finalizing" | "ready" | "error";
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
/**
 * Create a new voice session with a unique ID.
 */
export declare function createSession(): VoiceSession;
/**
 * Get the full display transcript from a session.
 * Uses the replacement model: confirmed parts + current interim.
 */
export declare function getDisplayTranscript(session: VoiceSession): string;
/**
 * Get the final transcript from a completed session.
 */
export declare function getFinalTranscript(session: VoiceSession): string;
//# sourceMappingURL=voice-session.d.ts.map