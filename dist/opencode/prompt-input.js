/**
 * Prompt input handler.
 *
 * Higher-level adapter that coordinates transcript insertion,
 * status display, and optional auto-submit.
 */
export class PromptInput {
    opencode;
    autoSubmit;
    constructor(opencode, autoSubmit = false) {
        this.opencode = opencode;
        this.autoSubmit = autoSubmit;
    }
    /**
     * Handle a finalized transcript.
     *
     * V1 behavior: insert into prompt, let user edit and submit manually.
     * If autoSubmit is enabled (opt-in), submit directly.
     */
    async handleTranscript(transcript) {
        if (!transcript.trim()) {
            await this.opencode.showToast("🎙 No speech detected", "info");
            return;
        }
        await this.opencode.insertText(transcript.trim());
        if (!this.autoSubmit) {
            await this.opencode.showToast("✅ Transcript ready — review and press Enter", "success");
        }
    }
    /**
     * Show recording status.
     */
    async showRecordingStatus(interimText) {
        const display = interimText
            ? `🎙 ${interimText}`
            : "🎙 Listening...";
        await this.opencode.showToast(display, "info");
    }
    /**
     * Show error status.
     */
    async showError(message) {
        await this.opencode.showToast(`⚠ Voice input failed: ${message}`, "error");
    }
    /**
     * Show processing status.
     */
    async showProcessing() {
        await this.opencode.showToast("🎙 Processing...", "info");
    }
}
//# sourceMappingURL=prompt-input.js.map