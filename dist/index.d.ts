/**
 * OpenCode Voice Input Plugin — Entry Point (V2 server plugin).
 *
 * V2 shape: default-export { id, setup }.
 * setup() registers the `voice` tool and owns the controller lifecycle.
 * Interactive push-to-talk stays in the TUI plugin; the server keeps a
 * best-effort global hotkey listener for headless use.
 *
 * Usage:
 *   1. Point the global shim at this file (no build step needed)
 *   2. Set WHISPER_PATH and WHISPER_MODEL_PATH (local Whisper, no API key)
 *   3. Restart OpenCode — plugin loads automatically
 */
export declare const VOICE_PLUGIN_ID = "opencode-voice";
declare function setup(ctx: any): Promise<(() => void) | undefined>;
declare const VoiceInputPluginV2: {
    id: string;
    setup: typeof setup;
};
export declare const VoiceInputPlugin: any;
export default VoiceInputPluginV2;
//# sourceMappingURL=index.d.ts.map