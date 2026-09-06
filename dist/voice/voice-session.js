/**
 * Voice session.
 *
 * Each recording creates a unique session. Sessions must never leak
 * state into the next recording.
 */
let sessionCounter = 0;
/**
 * Create a new voice session with a unique ID.
 */
export function createSession() {
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
export function getDisplayTranscript(session) {
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
export function getFinalTranscript(session) {
    return session.finalTranscript ?? session.finalParts.join(" ");
}
//# sourceMappingURL=voice-session.js.map