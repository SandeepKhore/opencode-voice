/**
 * Global hotkey manager.
 *
 * Listens for configurable hotkey combinations and drives the
 * voice controller in push-to-talk or toggle mode.
 *
 * Uses node-global-key-listener for cross-platform global hotkey
 * detection (requires Accessibility permissions on macOS).
 */

import { GlobalKeyboardListener } from "node-global-key-listener";
import type { VoiceController } from "../voice/voice-controller";
import type { VoiceConfig } from "../config/schema";

// Debounce threshold for rapid key presses
const DEBOUNCE_MS = 100;

interface ParsedHotkey {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

export class HotkeyManager {
  private readonly config: VoiceConfig;
  private readonly controller: VoiceController;
  private readonly apiKey: string;
  private listener: GlobalKeyboardListener | null = null;
  private parsedHotkey: ParsedHotkey;
  private lastKeyTime = 0;
  private isHotkeyDown = false;

  constructor(
    config: VoiceConfig,
    controller: VoiceController,
    apiKey: string,
  ) {
    this.config = config;
    this.controller = controller;
    this.apiKey = apiKey;
    this.parsedHotkey = parseHotkey(config.hotkey);
  }

  /**
   * Start listening for the configured hotkey.
   */
  async start(): Promise<void> {
    this.listener = new GlobalKeyboardListener();

    this.listener.addListener((event, down) => {
      if (!this.matchesHotkey(event, down)) return;

      const now = Date.now();

      if (event.state === "DOWN") {
        // Debounce rapid presses
        if (now - this.lastKeyTime < DEBOUNCE_MS) return;
        this.lastKeyTime = now;

        if (!this.isHotkeyDown) {
          this.isHotkeyDown = true;
          this.handleKeyDown();
        }
      } else if (event.state === "UP") {
        if (this.isHotkeyDown) {
          this.isHotkeyDown = false;
          this.handleKeyUp();
        }
      }
    });
  }

  /**
   * Stop listening and clean up.
   */
  async stop(): Promise<void> {
    if (this.listener) {
      this.listener.kill();
      this.listener = null;
    }
    this.isHotkeyDown = false;
  }

  // ── Private ────────────────────────────────────────────────

  private handleKeyDown(): void {
    if (this.config.mode === "push-to-talk") {
      // Push-to-talk: start on key down
      this.controller.startWithApiKey(this.apiKey).catch(() => {
        // Error handled by controller
      });
    } else {
      // Toggle: toggle on key down
      this.handleToggle();
    }
  }

  private handleKeyUp(): void {
    if (this.config.mode === "push-to-talk") {
      // Push-to-talk: stop on key up
      this.controller.stop().catch(() => {
        // Error handled by controller
      });
    }
    // Toggle mode ignores key up
  }

  private handleToggle(): void {
    const state = this.controller.state;

    if (state === "idle") {
      this.controller.startWithApiKey(this.apiKey).catch(() => {});
    } else if (state === "recording") {
      this.controller.stop().catch(() => {});
    } else {
      // In other states (starting, finalizing, etc.), cancel
      this.controller.cancel().catch(() => {});
    }
  }

  private matchesHotkey(
    event: { name?: string; rawKey?: Record<string, unknown>; state?: string },
    down: Record<string, boolean>,
  ): boolean {
    const keyName = String(event.name ?? (event.rawKey as any)?.standardName ?? "").toUpperCase();
    const expected = this.parsedHotkey;

    // For modifier-only hotkeys, check if this event IS the modifier key
    if (!expected.key) {
      const isCtrlEvent = expected.ctrl && (keyName === "LEFT CTRL" || keyName === "RIGHT CTRL");
      const isShiftEvent = expected.shift && (keyName === "LEFT SHIFT" || keyName === "RIGHT SHIFT");
      const isAltEvent = expected.alt && (keyName === "LEFT ALT" || keyName === "RIGHT ALT");
      const isMetaEvent = expected.meta && (keyName === "LEFT META" || keyName === "RIGHT META");

      return (isCtrlEvent || isShiftEvent || isAltEvent || isMetaEvent) && 
             (event.state === "DOWN" || event.state === "UP");
    }

    // For modifier+key combos, check current modifier state
    const ctrlDown = !!down["LEFT CTRL"] || !!down["RIGHT CTRL"] || !!down["CTRL"] || !!down["CONTROL"];
    const shiftDown = !!down["LEFT SHIFT"] || !!down["RIGHT SHIFT"] || !!down["SHIFT"];
    const altDown = !!down["LEFT ALT"] || !!down["RIGHT ALT"] || !!down["ALT"];
    const metaDown = !!down["LEFT META"] || !!down["RIGHT META"] || !!down["META"] || !!down["SUPER"];

    if (expected.ctrl !== ctrlDown) return false;
    if (expected.shift !== shiftDown) return false;
    if (expected.alt !== altDown) return false;
    if (expected.meta !== metaDown) return false;

    // Check the main key
    return keyName === expected.key.toUpperCase();
  }
}

/**
 * Parse a hotkey string like "ctrl+space" into its components.
 */
function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());

  const result: ParsedHotkey = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
  };

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        result.ctrl = true;
        break;
      case "shift":
        result.shift = true;
        break;
      case "alt":
      case "option":
        result.alt = true;
        break;
      case "meta":
      case "cmd":
      case "command":
      case "win":
        result.meta = true;
        break;
      default:
        result.key = part === "space" ? "SPACE" : part;
        break;
    }
  }

  return result;
}
