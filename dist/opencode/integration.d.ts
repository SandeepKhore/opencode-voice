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
            body: {
                service: string;
                level: string;
                message: string;
                extra?: Record<string, unknown>;
            };
        }): Promise<void>;
    };
    session: {
        chat(opts: {
            body: {
                sessionID: string;
                content: string;
            };
        }): Promise<unknown>;
        list(): Promise<{
            data?: Array<{
                id: string;
            }>;
        }>;
        create(): Promise<{
            data?: {
                id: string;
            };
        }>;
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
    showToast(message: string, variant?: "info" | "success" | "error"): Promise<void>;
    /**
     * Log a message via OpenCode's structured logging.
     */
    log(level: "debug" | "info" | "warn" | "error", message: string, extra?: Record<string, unknown>): Promise<void>;
}
/**
 * OpenCode adapter implementation.
 *
 * Uses the plugin context's `client` and `$` (shell) to interact
 * with OpenCode. The exact mechanism for prompt insertion will be
 * verified at runtime and may use different strategies.
 */
export declare class OpenCodeAdapter implements OpenCodeInput {
    private readonly client;
    constructor(client: OpenCodeClient, _shell?: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>);
    insertText(text: string): Promise<void>;
    showToast(message: string, _variant?: "info" | "success" | "error"): Promise<void>;
    log(level: "debug" | "info" | "warn" | "error", message: string, extra?: Record<string, unknown>): Promise<void>;
}
//# sourceMappingURL=integration.d.ts.map