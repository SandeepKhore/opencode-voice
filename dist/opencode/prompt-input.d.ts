/**
 * Prompt input handler.
 *
 * Higher-level adapter that coordinates transcript insertion,
 * status display, and optional auto-submit.
 */
import type { OpenCodeInput } from "./integration";
export declare class PromptInput {
    private readonly opencode;
    private readonly autoSubmit;
    constructor(opencode: OpenCodeInput, autoSubmit?: boolean);
    /**
     * Handle a finalized transcript.
     *
     * V1 behavior: insert into prompt, let user edit and submit manually.
     * If autoSubmit is enabled (opt-in), submit directly.
     */
    handleTranscript(transcript: string): Promise<void>;
    /**
     * Show recording status.
     */
    showRecordingStatus(interimText?: string): Promise<void>;
    /**
     * Show error status.
     */
    showError(message: string): Promise<void>;
    /**
     * Show processing status.
     */
    showProcessing(): Promise<void>;
}
//# sourceMappingURL=prompt-input.d.ts.map