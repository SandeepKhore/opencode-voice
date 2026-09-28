/**
 * Transcript aggregation.
 *
 * Uses the replacement model to prevent duplication:
 *   display = confirmedParts.join(" ") + " " + currentInterim
 *
 * On each "partial" event, the currentInterim is replaced (not appended).
 * On each "final" event, the text moves to confirmedParts.
 */
export class TranscriptAggregator {
    confirmedParts = [];
    currentInterim = "";
    /**
     * Handle a partial (interim) transcript.
     * Replaces the current interim — does NOT append.
     */
    handlePartial(text) {
        this.currentInterim = text;
    }
    /**
     * Handle a final transcript.
     * Moves to confirmed parts, clears interim.
     */
    handleFinal(text) {
        if (text.trim()) {
            this.confirmedParts.push(text.trim());
        }
        this.currentInterim = "";
    }
    /**
     * Get the current display transcript.
     * Combines confirmed parts with the current interim.
     */
    getDisplay() {
        const confirmed = this.confirmedParts.join(" ");
        if (this.currentInterim) {
            return confirmed
                ? `${confirmed} ${this.currentInterim}`
                : this.currentInterim;
        }
        return confirmed;
    }
    /**
     * Get the final transcript (confirmed parts only).
     */
    getFinal() {
        return this.confirmedParts.join(" ");
    }
    /**
     * Whether any transcript has been received.
     */
    get hasContent() {
        return this.confirmedParts.length > 0 || this.currentInterim.length > 0;
    }
    /**
     * Reset all state.
     */
    reset() {
        this.confirmedParts = [];
        this.currentInterim = "";
    }
}
/**
 * Remove non-speech annotations that STT engines emit for noise or
 * silence, e.g. "[BLANK_AUDIO]", "(air whooshing)", "*music*".
 *
 * Bracketed tags are always removed (they never represent speech).
 * Parenthesized/starred segments are only dropped when the transcript
 * has nothing else in it, so dictated text containing parentheses
 * survives. Returns "" when no speech remains.
 */
export function stripNonSpeech(text) {
    const withoutTags = text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
    const withoutAnnotations = withoutTags.replace(/\([^)]*\)|\*[^*]*\*/g, " ");
    if (!/[\p{L}\p{N}]/u.test(withoutAnnotations)) {
        return "";
    }
    return withoutTags;
}
//# sourceMappingURL=transcript.js.map