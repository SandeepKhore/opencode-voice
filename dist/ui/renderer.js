/**
 * UI renderer.
 *
 * Connects VoiceController state changes to OpenCode toast display.
 * Subscribes to the controller and shows appropriate status.
 */
import { getDisplayTranscript } from "../voice/voice-session";
import { getStatusDisplay } from "./voice-status";
export class VoiceRenderer {
    controller;
    opencode;
    unsubscribe = null;
    constructor(controller, opencode) {
        this.controller = controller;
        this.opencode = opencode;
    }
    /**
     * Start rendering state changes as toasts.
     */
    start() {
        this.unsubscribe = this.controller.onStateChange((state, session) => {
            this.render(state, session).catch(() => {
                // Non-critical — don't crash on render failures
            });
        });
    }
    /**
     * Stop rendering.
     */
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
    async render(state, session) {
        const display = getStatusDisplay(state, {
            interimText: getDisplayTranscript(session),
            errorMessage: session.error?.message,
        });
        if (display) {
            await this.opencode.showToast(display.message, display.variant);
        }
    }
}
//# sourceMappingURL=renderer.js.map