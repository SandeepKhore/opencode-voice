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

import { PromptInsertionError, OpenCodeIntegrationError } from "../errors/voice-errors";

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
      // Strategy 1: Try using the TUI prompt append mechanism.
      // The OpenCode plugin API exposes `tui.prompt.append` as a TUI event.
      // We attempt to trigger it via the client's TUI control.
      //
      // Since the exact SDK surface for dispatching TUI events is not
      // fully documented, we try the most likely approaches:

      // Approach: Use the session chat API to send the text.
      // This effectively "types" the message into the active session.
      // Note: This SUBMITS the prompt. We only use this if autoSubmit is
      // desired. For V1, we log the transcript and instruct the user.

      // For now, the safest approach is to log the transcript prominently
      // and let the user copy-paste. This will be upgraded when we verify
      // the exact tui.prompt.append invocation at runtime.

      await this.log("info", `🎙 Voice transcript: ${text}`);

      // Attempt programmatic prompt append via shell if possible
      // This is a placeholder — Task 2 will verify the exact mechanism
      try {
        // Try to trigger the TUI prompt append
        // OpenCode may expose this via client methods or server API
        await this.attemptPromptAppend(text);
      } catch {
        // Fallback: just log it. User sees it in the log.
        await this.log(
          "info",
          `📋 Copy to prompt: ${text}`,
        );
      }
    } catch (err) {
      throw new PromptInsertionError(
        `Failed to insert text: ${err instanceof Error ? err.message : String(err)}`,
      );
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

  // ── Private ────────────────────────────────────────────────

  private async attemptPromptAppend(text: string): Promise<void> {
    // Strategy: Use the OpenCode HTTP server API if available.
    // The server exposes endpoints like /tui/prompt-append.
    // We try localhost on the default OpenCode server port.
    //
    // This will be refined in Task 2 when we verify the exact API.

    try {
      const response = await fetch("http://localhost:3000/tui/prompt-append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new OpenCodeIntegrationError(
          `Prompt append API returned ${response.status}`,
        );
      }
    } catch (err) {
      if (err instanceof OpenCodeIntegrationError) throw err;

      // Server might not be on port 3000, or endpoint might differ.
      // This is expected to fail until Task 2 verifies the API.
      throw new OpenCodeIntegrationError(
        `Prompt append not available: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
