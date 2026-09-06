/**
 * OpenCode integration adapter.
 *
 * Provides the `OpenCodeInput` interface that the voice controller
 * uses to insert text into the OpenCode prompt. Isolated behind
 * an adapter so the voice module has no direct OpenCode dependency.
 *
 * Implementation strategy (in priority order):
 * 1. SDK client event dispatch (tui.prompt.append)
 * 2. Fallback: direct client API call
 */
/**
 * OpenCode adapter implementation.
 *
 * Uses the plugin context's `client` and `$` (shell) to interact
 * with OpenCode. The exact mechanism for prompt insertion will be
 * verified at runtime and may use different strategies.
 */
export class OpenCodeAdapter {
    client;
    constructor(client, _shell) {
        this.client = client;
    }
    async insertText(text) {
        if (!text.trim())
            return;
        try {
            // Use the TUI appendPrompt API to insert text into the prompt
            await this.client.tui.appendPrompt({
                body: { text },
            });
            await this.log("info", `🎙 Transcript appended: ${text}`);
        }
        catch (err) {
            // If append fails, at least log it
            await this.log("warn", `🎙 Transcript (not sent): ${text}`);
            await this.log("error", `Append error: ${err}`);
        }
    }
    async showToast(message, _variant = "info") {
        try {
            // Toast via structured log — visible in OpenCode's log panel
            await this.log("info", message);
        }
        catch {
            // Toasts are non-critical — don't throw
        }
    }
    async log(level, message, extra) {
        try {
            await this.client.app.log({
                body: {
                    service: "voice-input",
                    level,
                    message,
                    extra,
                },
            });
        }
        catch {
            // Last resort: console
            console.error(`[voice-input] ${level}: ${message}`);
        }
    }
}
//# sourceMappingURL=integration.js.map