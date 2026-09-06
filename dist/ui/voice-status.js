/**
 * Voice status display.
 *
 * Maps VoiceState to user-facing display strings for toasts.
 */
/**
 * Get the display representation for a voice state.
 */
export function getStatusDisplay(state, context) {
    switch (state) {
        case "idle":
            return null; // No display when idle
        case "starting":
            return { message: "🎙 Starting...", variant: "info" };
        case "recording": {
            const text = context?.interimText;
            return {
                message: text ? `🎙 ${text}` : "🎙 Listening...",
                variant: "info",
            };
        }
        case "finalizing":
            return { message: "🎙 Processing...", variant: "info" };
        case "ready":
            return { message: "✅ Transcript ready", variant: "success" };
        case "error":
            return {
                message: `⚠ Voice input failed${context?.errorMessage ? `: ${context.errorMessage}` : ""}`,
                variant: "error",
            };
    }
}
//# sourceMappingURL=voice-status.js.map