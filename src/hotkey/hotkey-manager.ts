/**
 * Global hotkey manager.
 *
 * Listens for configurable hotkey combinations and drives the
 * voice controller in push-to-talk or toggle mode.
 *
 * Uses node-global-key-listener on macOS/Windows/X11 (requires
 * Accessibility permissions on macOS). On Linux, keyboards are read
 * directly via evdev when accessible, which also works under Wayland.
 */

import { accessSync, chmodSync, constants } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { GlobalKeyboardListener } from "node-global-key-listener";
import { EvdevKeyboardListener } from "./evdev-listener";
import type { VoiceController } from "../voice/voice-controller";
import type { VoiceConfig } from "../config/schema";

// Debounce threshold for rapid key presses
const DEBOUNCE_MS = 100;

// Modifier-only hotkeys (e.g. "ctrl") double as shortcut modifiers, so
// push-to-talk only starts once the key has been held alone this long.
// Quick shortcuts like Ctrl+C never reach it.
const HOLD_DELAY_MS = 400;

type KeyboardListener = GlobalKeyboardListener | EvdevKeyboardListener;

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
  private listener: KeyboardListener | null = null;
  private parsedHotkey: ParsedHotkey;
  private lastKeyTime = 0;
  private isHotkeyDown = false;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  // Another key was pressed while a modifier-only hotkey was held
  private interrupted = false;
  // Push-to-talk recording was started by the current hold
  private holdStarted = false;

  private readonly listenerFactory: () => KeyboardListener;

  constructor(
    config: VoiceConfig,
    controller: VoiceController,
    apiKey: string,
    listenerFactory: () => KeyboardListener = createListener,
  ) {
    this.config = config;
    this.controller = controller;
    this.apiKey = apiKey;
    this.listenerFactory = listenerFactory;
    this.parsedHotkey = parseHotkey(config.hotkey);
  }

  /**
   * Start listening for the configured hotkey.
   */
  async start(): Promise<void> {
    this.listener = this.listenerFactory();

    await this.listener.addListener((event: { name?: string; state?: string }, down: Record<string, boolean>) => {
      if (!this.matchesHotkey(event, down)) {
        // Any other key while holding a modifier-only hotkey means the
        // user is typing a shortcut (Ctrl+C, Ctrl+V…), not dictating.
        if (event.state === "DOWN" && this.isHotkeyDown && this.isModifierOnly) {
          this.handleInterrupt();
        }
        return;
      }

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
    this.clearHoldTimer();
  }

  // ── Private ────────────────────────────────────────────────

  private get isModifierOnly(): boolean {
    return !this.parsedHotkey.key;
  }

  private handleKeyDown(): void {
    if (this.isModifierOnly) {
      this.interrupted = false;
      this.holdStarted = false;

      if (this.config.mode === "push-to-talk") {
        this.holdTimer = setTimeout(() => {
          this.holdTimer = null;
          if (!this.isHotkeyDown || this.interrupted) return;
          this.holdStarted = true;
          this.controller.startWithApiKey(this.apiKey).catch(() => {
            // Error handled by controller
          });
        }, HOLD_DELAY_MS);
      }
      // Toggle mode acts on a clean tap — see handleKeyUp
      return;
    }

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
    if (this.isModifierOnly) {
      this.clearHoldTimer();

      if (this.config.mode === "push-to-talk") {
        // Released before the hold delay: it was just a tap, do nothing
        if (this.holdStarted) {
          this.holdStarted = false;
          this.stopRecording();
        }
      } else if (!this.interrupted) {
        this.handleToggle();
      }
      return;
    }

    if (this.config.mode === "push-to-talk") {
      this.stopRecording();
    }
    // Toggle mode ignores key up for key combos
  }

  private handleInterrupt(): void {
    this.interrupted = true;
    this.clearHoldTimer();

    if (this.holdStarted) {
      this.holdStarted = false;
      this.controller.cancel().catch(() => {});
    }
  }

  private stopRecording(): void {
    // stop() is a no-op while still connecting, which would leave the
    // mic running after release — cancel instead.
    const action =
      this.controller.state === "starting"
        ? this.controller.cancel()
        : this.controller.stop();
    action.catch(() => {
      // Error handled by controller
    });
  }

  private clearHoldTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
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
 * Pick the keyboard listener for this platform.
 *
 * Linux: prefer evdev (works on X11 and Wayland). Fall back to the X11
 * key server only on an X11 session, since under Wayland it would
 * silently miss keys typed into native Wayland windows.
 */
function createListener(): KeyboardListener {
  if (process.platform !== "linux") {
    return new GlobalKeyboardListener();
  }

  const evdev = new EvdevKeyboardListener();
  try {
    evdev.start();
    return evdev;
  } catch (err) {
    const isWayland =
      process.env.XDG_SESSION_TYPE === "wayland" || !!process.env.WAYLAND_DISPLAY;
    if (isWayland || !process.env.DISPLAY) {
      throw err;
    }
  }

  const serverPath = ensureX11ServerExecutable();
  return new GlobalKeyboardListener(serverPath ? { x11: { serverPath } } : {});
}

/**
 * The bundled X11KeyServer can lose its executable bit when installed
 * from a git/tarball source; node-global-key-listener would then fall
 * back to a graphical sudo prompt. Fix it ourselves when we own the file.
 */
function ensureX11ServerExecutable(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const pkgDir = dirname(require.resolve("node-global-key-listener/package.json"));
    const serverPath = join(pkgDir, "bin", "X11KeyServer");
    try {
      accessSync(serverPath, constants.X_OK);
    } catch {
      chmodSync(serverPath, 0o755);
    }
    return serverPath;
  } catch {
    return undefined;
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
