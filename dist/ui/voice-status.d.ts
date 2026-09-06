/**
 * Voice status display.
 *
 * Maps VoiceState to user-facing display strings for toasts.
 */
import type { VoiceState } from "../voice/voice-session";
export interface VoiceStatusDisplay {
    message: string;
    variant: "info" | "success" | "error";
}
/**
 * Get the display representation for a voice state.
 */
export declare function getStatusDisplay(state: VoiceState, context?: {
    interimText?: string;
    errorMessage?: string;
}): VoiceStatusDisplay | null;
//# sourceMappingURL=voice-status.d.ts.map