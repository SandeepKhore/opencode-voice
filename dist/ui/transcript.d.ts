/**
 * Transcript aggregation.
 *
 * Uses the replacement model to prevent duplication:
 *   display = confirmedParts.join(" ") + " " + currentInterim
 *
 * On each "partial" event, the currentInterim is replaced (not appended).
 * On each "final" event, the text moves to confirmedParts.
 */
export declare class TranscriptAggregator {
    private confirmedParts;
    private currentInterim;
    /**
     * Handle a partial (interim) transcript.
     * Replaces the current interim — does NOT append.
     */
    handlePartial(text: string): void;
    /**
     * Handle a final transcript.
     * Moves to confirmed parts, clears interim.
     */
    handleFinal(text: string): void;
    /**
     * Get the current display transcript.
     * Combines confirmed parts with the current interim.
     */
    getDisplay(): string;
    /**
     * Get the final transcript (confirmed parts only).
     */
    getFinal(): string;
    /**
     * Whether any transcript has been received.
     */
    get hasContent(): boolean;
    /**
     * Reset all state.
     */
    reset(): void;
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
export declare function stripNonSpeech(text: string): string;
//# sourceMappingURL=transcript.d.ts.map