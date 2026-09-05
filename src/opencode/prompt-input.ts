/**
 * Prompt input handler.
 *
 * Higher-level adapter that coordinates transcript insertion,
 * status display, and optional auto-submit.
 */

import type { OpenCodeInput } from "./integration";

export class PromptInput {
  private readonly opencode: OpenCodeInput;
  private readonly autoSubmit: boolean;

  constructor(opencode: OpenCodeInput, autoSubmit = false) {
    this.opencode = opencode;
    this.autoSubmit = autoSubmit;
  }

  /**
   * Handle a finalized transcript.
   *
   * V1 behavior: insert into prompt, let user edit and submit manually.
   * If autoSubmit is enabled (opt-in), submit directly.
   */
  async handleTranscript(transcript: string): Promise<void> {
    if (!transcript.trim()) {
      await this.opencode.showToast("🎙 No speech detected", "info");
      return;
    }

    await this.opencode.insertText(transcript.trim());

    if (!this.autoSubmit) {
      await this.opencode.showToast(
        "✅ Transcript ready — review and press Enter",
        "success",
      );
    }
  }

  /**
   * Show recording status.
   */
  async showRecordingStatus(interimText?: string): Promise<void> {
    const display = interimText
      ? `🎙 ${interimText}`
      : "🎙 Listening...";

    await this.opencode.showToast(display, "info");
  }

  /**
   * Show error status.
   */
  async showError(message: string): Promise<void> {
    await this.opencode.showToast(
      `⚠ Voice input failed: ${message}`,
      "error",
    );
  }

  /**
   * Show processing status.
   */
  async showProcessing(): Promise<void> {
    await this.opencode.showToast("🎙 Processing...", "info");
  }
}
