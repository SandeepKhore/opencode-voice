/**
 * Global hotkey manager.
 *
 * Listens for configurable hotkey combinations and drives the
 * voice controller in push-to-talk or toggle mode.
 *
 * Uses node-global-key-listener for cross-platform global hotkey
 * detection (requires Accessibility permissions on macOS).
 */
import type { VoiceController } from "../voice/voice-controller";
import type { VoiceConfig } from "../config/schema";
export declare class HotkeyManager {
    private readonly config;
    private readonly controller;
    private readonly apiKey;
    private listener;
    private parsedHotkey;
    private lastKeyTime;
    private isHotkeyDown;
    constructor(config: VoiceConfig, controller: VoiceController, apiKey: string);
    /**
     * Start listening for the configured hotkey.
     */
    start(): Promise<void>;
    /**
     * Stop listening and clean up.
     */
    stop(): Promise<void>;
    private handleKeyDown;
    private handleKeyUp;
    private handleToggle;
    private matchesHotkey;
}
//# sourceMappingURL=hotkey-manager.d.ts.map