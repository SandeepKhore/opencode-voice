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
//# sourceMappingURL=transcript.js.map