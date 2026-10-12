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
import { loadConfig } from "./config/loader";
import { WhisperCppProvider } from "./stt/whispercpp-provider";
import { VoiceController } from "./voice/voice-controller";
import { HotkeyManager } from "./hotkey/hotkey-manager";
import { VoiceRenderer } from "./ui/renderer";
export const VOICE_PLUGIN_ID = "opencode-voice";
async function setup(ctx) {
    const log = (level, message) => {
        const line = `[voice-input] ${level}: ${message}`;
        if (level === "error")
            console.error(line);
        else
            console.log(line);
    };
    let resolvedConfig;
    try {
        resolvedConfig = loadConfig();
    }
    catch (err) {
        log("warn", `Voice plugin disabled: ${err instanceof Error ? err.message : String(err)}`);
        return;
    }
    if (!resolvedConfig.voice.enabled) {
        log("info", "Voice plugin disabled by configuration");
        return;
    }
    // Transcript is captured here so the tool can return it to the agent.
    // shortcut: server logs transcripts instead of inserting into the TUI prompt; move insertion to the TUI plugin when it needs them.
    let lastTranscript = "";
    const opencodeInput = {
        insertText: async (text) => {
            lastTranscript = text;
            if (text.trim())
                log("info", `Transcript: ${text}`);
        },
        showToast: async (message) => {
            log("info", message);
        },
        log: async (level, message) => {
            log(level, message);
        },
    };
    const stt = new WhisperCppProvider();
    const controller = new VoiceController(stt, opencodeInput, resolvedConfig.voice);
    const hotkeys = new HotkeyManager(resolvedConfig.voice, controller, resolvedConfig.apiKey);
    const renderer = new VoiceRenderer(controller, opencodeInput);
    renderer.start();
    try {
        await hotkeys.start();
        log("info", `Voice input ready — hold ${resolvedConfig.voice.hotkey} to speak`);
    }
    catch (err) {
        log("error", `Hotkey listener not started: ${err instanceof Error ? err.message : String(err)}. ` +
            (process.platform === "linux"
                ? `On Linux, ensure you can read /dev/input (sudo usermod -aG input $USER, then log out and back in).`
                : `On macOS, ensure Accessibility permissions are granted.`));
    }
    const toggle = async () => {
        if (controller.state === "idle") {
            lastTranscript = "";
            await controller.startWithApiKey(resolvedConfig.apiKey);
            const started = controller.state;
            return started === "recording" ? "Voice recording started" : `Voice state: ${started}`;
        }
        if (controller.state === "recording") {
            await controller.stop();
            return lastTranscript.trim() ? lastTranscript : "Voice recording stopped";
        }
        await controller.cancel();
        return "Voice recording cancelled";
    };
    if (ctx?.tool?.transform) {
        await ctx.tool.transform((editor) => {
            editor.add({
                name: "voice",
                description: "Start or stop voice input recording (/voice)",
                input: {
                    type: "object",
                    properties: {},
                    additionalProperties: false,
                },
                execute: async () => {
                    return { content: await toggle() };
                },
            });
        });
    }
    else {
        log("warn", "ctx.tool.transform unavailable — voice tool not registered");
    }
    // Cancel in-progress recordings when sessions change (V1 `event` hook equivalent).
    let aborter = null;
    if (ctx?.event?.subscribe) {
        aborter = new AbortController();
        const signal = aborter.signal;
        void (async () => {
            try {
                for await (const event of ctx.event.subscribe({ signal })) {
                    if (event?.type === "session.created" || event?.type === "session.deleted") {
                        await controller.cancel().catch(() => { });
                    }
                }
            }
            catch {
                // Aborted on unload.
            }
        })();
    }
    return () => {
        aborter?.abort();
        renderer.stop();
        hotkeys.stop().catch(() => { });
    };
}
const VoiceInputPluginV2 = { id: VOICE_PLUGIN_ID, setup };
// Named export kept for the global shim (`export { default, VoiceInputPlugin }`).
export const VoiceInputPlugin = VoiceInputPluginV2;
export default VoiceInputPluginV2;
//# sourceMappingURL=index.js.map