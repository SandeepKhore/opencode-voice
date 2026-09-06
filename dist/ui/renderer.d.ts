/**
 * UI renderer.
 *
 * Connects VoiceController state changes to OpenCode toast display.
 * Subscribes to the controller and shows appropriate status.
 */
import type { VoiceController } from "../voice/voice-controller";
import type { OpenCodeInput } from "../opencode/integration";
export declare class VoiceRenderer {
    private readonly controller;
    private readonly opencode;
    private unsubscribe;
    constructor(controller: VoiceController, opencode: OpenCodeInput);
    /**
     * Start rendering state changes as toasts.
     */
    start(): void;
    /**
     * Stop rendering.
     */
    stop(): void;
    private render;
}
//# sourceMappingURL=renderer.d.ts.map