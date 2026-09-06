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


/** Minimal interface for the OpenCode SDK client. */
export interface OpenCodeClient {
  app: {
    log(opts: {
      body: { service: string; level: string; message: string; extra?: Record<string, unknown> };
    }): Promise<void>;
  };
  session: {
    chat(opts: {
      body: { sessionID: string; content: string };
    }): Promise<unknown>;
    list(): Promise<{ data?: Array<{ id: string }> }>;
    create(): Promise<{ data?: { id: string } }>;
  };
}

/**
 * Interface for inserting text into OpenCode.
 *
 * The voice controller depends on this, not on OpenCode internals.
 */
export interface OpenCodeInput {
  /**
   * Insert text into the OpenCode prompt editor.
   * The user can review and edit before pressing Enter.
   */
  insertText(text: string): Promise<void>;

  /**
   * Show a toast notification in the TUI.
   */
  showToast(
    message: string,
    variant?: "info" | "success" | "error",
  ): Promise<void>;

  /**
   * Log a message via OpenCode's structured logging.
   */
  log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void>;
}

/**
 * OpenCode adapter implementation.
 *
 * Uses the plugin context's `client` and `$` (shell) to interact
 * with OpenCode. The exact mechanism for prompt insertion will be
 * verified at runtime and may use different strategies.
 */
export class OpenCodeAdapter implements OpenCodeInput {
  private readonly client: OpenCodeClient;

  constructor(
    client: OpenCodeClient,
    _shell?: (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<unknown>,
  ) {
    this.client = client;
  }

  async insertText(text: string): Promise<void> {
    if (!text.trim()) return;

    try {
      // Use the TUI appendPrompt API to insert text into the prompt
      await (this.client as any).tui.appendPrompt({
        body: { text },
      });
      await this.log("info", `🎙 Transcript appended: ${text}`);
    } catch (err) {
      // If append fails, at least log it
      await this.log("warn", `🎙 Transcript (not sent): ${text}`);
      await this.log("error", `Append error: ${err}`);
    }
  }

  async showToast(
    message: string,
    _variant: "info" | "success" | "error" = "info",
  ): Promise<void> {
    try {
      // Toast via structured log — visible in OpenCode's log panel
      await this.log("info", message);
    } catch {
      // Toasts are non-critical — don't throw
    }
  }

  async log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.client.app.log({
        body: {
          service: "voice-input",
          level,
          message,
          extra,
        },
      });
    } catch {
      // Last resort: console
      console.error(`[voice-input] ${level}: ${message}`);
    }
  }

}
