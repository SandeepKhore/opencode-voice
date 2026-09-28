/**
 * Tests for HotkeyManager push-to-talk behavior with modifier-only hotkeys.
 */

import { describe, test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { HotkeyManager } from "../../src/hotkey/hotkey-manager";
import { DEFAULT_CONFIG, type VoiceConfig } from "../../src/config/schema";

type KeyCallback = (event: { name: string; state: string }, down: Record<string, boolean>) => void;

class FakeListener {
  callback: KeyCallback | null = null;
  down: Record<string, boolean> = {};
  async addListener(cb: KeyCallback) {
    this.callback = cb;
  }
  kill() {}
  press(name: string) {
    this.down[name] = true;
    this.callback?.({ name, state: "DOWN" }, this.down);
  }
  release(name: string) {
    this.down[name] = false;
    this.callback?.({ name, state: "UP" }, this.down);
  }
}

function fakeController() {
  const calls: string[] = [];
  const controller = {
    state: "idle" as string,
    async startWithApiKey() {
      calls.push("start");
      controller.state = "recording";
    },
    async stop() {
      calls.push("stop");
      controller.state = "idle";
    },
    async cancel() {
      calls.push("cancel");
      controller.state = "idle";
    },
  };
  return { controller, calls };
}

async function setup(overrides: Partial<VoiceConfig> = {}) {
  const listener = new FakeListener();
  const { controller, calls } = fakeController();
  const manager = new HotkeyManager(
    { ...DEFAULT_CONFIG, ...overrides },
    controller as any,
    "key",
    () => listener as any,
  );
  await manager.start();
  return { listener, calls, controller };
}

describe("HotkeyManager (modifier-only push-to-talk)", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "Date"], now: 10_000 }));
  afterEach(() => mock.timers.reset());

  test("quick tap does not start recording", async () => {
    const { listener, calls } = await setup();
    listener.press("LEFT CTRL");
    mock.timers.tick(150);
    listener.release("LEFT CTRL");
    mock.timers.tick(1000);
    assert.deepEqual(calls, []);
  });

  test("shortcut like Ctrl+C does not start recording", async () => {
    const { listener, calls } = await setup();
    listener.press("LEFT CTRL");
    mock.timers.tick(100);
    listener.press("C");
    mock.timers.tick(1000);
    listener.release("C");
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, []);
  });

  test("holding past the delay starts, releasing stops", async () => {
    const { listener, calls } = await setup();
    listener.press("LEFT CTRL");
    mock.timers.tick(450);
    assert.deepEqual(calls, ["start"]);
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, ["start", "stop"]);
  });

  test("pressing another key mid-recording cancels it", async () => {
    const { listener, calls } = await setup();
    listener.press("LEFT CTRL");
    mock.timers.tick(450);
    listener.press("V");
    listener.release("V");
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, ["start", "cancel"]);
  });

  test("release while still starting cancels instead of stopping", async () => {
    const { listener, calls, controller } = await setup();
    controller.startWithApiKey = async () => {
      calls.push("start");
      controller.state = "starting";
    };
    listener.press("LEFT CTRL");
    mock.timers.tick(450);
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, ["start", "cancel"]);
  });

  test("toggle mode toggles on a clean tap only", async () => {
    const { listener, calls } = await setup({ mode: "toggle" });
    listener.press("LEFT CTRL");
    listener.press("C");
    listener.release("C");
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, []);

    mock.timers.tick(200);
    listener.press("LEFT CTRL");
    listener.release("LEFT CTRL");
    assert.deepEqual(calls, ["start"]);
  });
});
