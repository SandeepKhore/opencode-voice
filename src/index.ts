/**
 * OpenCode Voice Input Plugin — Entry Point
 *
 * Registers the voice input plugin with OpenCode. Initializes
 * the STT provider, audio recorder, voice controller, hotkey
 * manager, and UI renderer.
 *
 * Usage:
 *   1. Place in .opencode/plugins/ or publish to npm
 *   2. Set DEEPGRAM_API_KEY environment variable
 *   3. Start OpenCode — plugin loads automatically
 *   4. Hold Ctrl+Space to speak, release to finalize
 *   5. Review transcript in prompt, press Enter
 */

import type { Plugin } from "@opencode-ai/plugin";
import { loadConfig } from "./config/loader";
import { DeepgramProvider } from "./stt/deepgram-provider";
import { OpenCodeAdapter, type OpenCodeClient } from "./opencode/integration";
import { VoiceController } from "./voice/voice-controller";
import { HotkeyManager } from "./hotkey/hotkey-manager";
import { VoiceRenderer } from "./ui/renderer";

export const VoiceInputPlugin: Plugin = async (ctx) => {
  // Cast the OpenCode SDK client to our minimal interface
  const client = ctx.client as unknown as OpenCodeClient;

  const log = async (
    level: "info" | "warn" | "error",
    message: string,
  ): Promise<void> => {
    try {
      await client.app.log({
        body: { service: "voice-input", level, message },
      });
    } catch {
      console.error(`[voice-input] ${level}: ${message}`);
    }
  };

  // ── Load configuration ─────────────────────────────────────

  let resolvedConfig;
  try {
    resolvedConfig = loadConfig();
  } catch (err) {
    await log(
      "warn",
      `Voice plugin disabled: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {};
  }

  if (!resolvedConfig.voice.enabled) {
    await log("info", "Voice plugin disabled by configuration");
    return {};
  }

  // ── Initialize modules ─────────────────────────────────────

  const stt = new DeepgramProvider();
  const opencode = new OpenCodeAdapter(
    client,
    ctx.$ as (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<unknown>,
  );
  const controller = new VoiceController(
    stt,
    opencode,
    resolvedConfig.voice,
  );
  const hotkeys = new HotkeyManager(
    resolvedConfig.voice,
    controller,
    resolvedConfig.apiKey,
  );
  const renderer = new VoiceRenderer(controller, opencode);

  // ── Start ──────────────────────────────────────────────────

  renderer.start();

  try {
    await hotkeys.start();
    await log(
      "info",
      `Voice input ready — hold ${resolvedConfig.voice.hotkey} to speak`,
    );
  } catch (err) {
    await log(
      "error",
      `Failed to start hotkey listener: ${err instanceof Error ? err.message : String(err)}. ` +
        `On macOS, ensure Accessibility permissions are granted.`,
    );
  }

  // ── Plugin hooks ───────────────────────────────────────────

  return {
    event: async ({ event }) => {
      // Clean up when session ends
      if (
        event.type === "session.deleted" ||
        event.type === "session.created"
      ) {
        // Cancel any in-progress recording on session change
        await controller.cancel();
      }
    },
  };
};

// Also export as default for flexibility
export default VoiceInputPlugin;
