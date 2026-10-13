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
import type { OpenCodeInput } from "./opencode/integration";
import { VoiceRpc } from "./rpc";
import { VoiceController } from "./voice/voice-controller";
import { HotkeyManager } from "./hotkey/hotkey-manager";
import { VoiceRenderer } from "./ui/renderer";

export const VOICE_PLUGIN_ID = "opencode-voice";

async function setup(ctx: any) {
  const log = (level: "debug" | "info" | "warn" | "error", message: string): void => {
    const line = `[voice-input] ${level}: ${message}`;
    if (level === "error") console.error(line);
    else console.log(line);
  };

  let resolvedConfig;
  try {
    resolvedConfig = loadConfig();
  } catch (err) {
    log("warn", `Voice plugin disabled: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!resolvedConfig.voice.enabled) {
    log("info", "Voice plugin disabled by configuration");
    return;
  }

  // Transcript is captured here so the tool can return it to the agent, and
  // emitted as an RPC event so the TUI plugin can offer it for review — the
  // server has no API for inserting text into the prompt draft.
  let lastTranscript = "";
  let emitTranscript: ((text: string) => Promise<void>) | null = null;
  let disposeRpc: (() => Promise<void>) | null = null;
  try {
    const registration = await ctx.rpc.register(VoiceRpc, {});
    emitTranscript = async (text: string): Promise<void> => {
      await registration.events.emit("transcript", { text });
    };
    disposeRpc = () => registration.dispose();
  } catch (err) {
    log("warn", `Voice transcript events unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }
  const opencodeInput: OpenCodeInput = {
    insertText: async (text: string): Promise<void> => {
      lastTranscript = text;
      if (!text.trim()) return;
      log("info", `Transcript: ${text}`);
      await emitTranscript?.(text).catch((err) =>
        log("warn", `Transcript event not delivered: ${err instanceof Error ? err.message : String(err)}`),
      );
    },
    showToast: async (message: string): Promise<void> => {
      log("info", message);
    },
    log: async (level, message): Promise<void> => {
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
  } catch (err) {
    log(
      "error",
      `Hotkey listener not started: ${err instanceof Error ? err.message : String(err)}. ` +
        (process.platform === "linux"
          ? `On Linux, ensure you can read /dev/input (sudo usermod -aG input $USER, then log out and back in).`
          : `On macOS, ensure Accessibility permissions are granted.`),
    );
  }

  const toggle = async (): Promise<string> => {
    if (controller.state === "idle") {
      lastTranscript = "";
      await controller.startWithApiKey(resolvedConfig.apiKey);
      const started: string = controller.state;
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
    await ctx.tool.transform((editor: any) => {
      editor.add({
        name: "voice",
        description: "Start or stop voice input recording",
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
  } else {
    log("warn", "ctx.tool.transform unavailable — voice tool not registered");
  }

  // Cancel in-progress recordings when sessions change (V1 `event` hook equivalent).
  let aborter: AbortController | null = null;
  if (ctx?.event?.subscribe) {
    aborter = new AbortController();
    const signal = aborter.signal;
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal })) {
          if (event?.type === "session.created" || event?.type === "session.deleted") {
            await controller.cancel().catch(() => {});
          }
        }
      } catch {
        // Aborted on unload.
      }
    })();
  }

  return () => {
    aborter?.abort();
    renderer.stop();
    hotkeys.stop().catch(() => {});
    disposeRpc?.().catch(() => {});
  };
}

const VoiceInputPluginV2 = { id: VOICE_PLUGIN_ID, setup };

// Named export kept for the global shim (`export { default, VoiceInputPlugin }`).
export const VoiceInputPlugin: any = VoiceInputPluginV2;
export default VoiceInputPluginV2;
