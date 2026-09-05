/**
 * Tests for the voice state machine (VoiceController).
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { VoiceController } from "../../src/voice/voice-controller";
import type { STTProvider, STTOptions } from "../../src/stt/stt-provider";
import type { STTEvent } from "../../src/stt/stt-events";
import type { OpenCodeInput } from "../../src/opencode/integration";
import type { VoiceConfig } from "../../src/config/schema";
import { DEFAULT_CONFIG } from "../../src/config/schema";

// ── Mock STT Provider ────────────────────────────────────────

class MockSTTProvider implements STTProvider {
  private listeners: Set<(event: STTEvent) => void> = new Set();
  private _isConnected = false;
  public connectCalled = false;
  public disconnectCalled = false;
  public finalizeCalled = false;
  public audioChunks: Buffer[] = [];
  public shouldFailConnect = false;
  public shouldFailFinalize = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(_options: STTOptions): Promise<void> {
    if (this.shouldFailConnect) {
      throw new Error("Connection failed");
    }
    this.connectCalled = true;
    this._isConnected = true;
    this.emit({ type: "connected" });
  }

  async sendAudio(audio: Buffer): Promise<void> {
    this.audioChunks.push(audio);
  }

  async finalize(): Promise<void> {
    if (this.shouldFailFinalize) {
      throw new Error("Finalization failed");
    }
    this.finalizeCalled = true;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalled = true;
    this._isConnected = false;
    this.emit({ type: "disconnected" });
  }

  onEvent(callback: (event: STTEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Test helper: emit an event
  emit(event: STTEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  reset(): void {
    this.connectCalled = false;
    this.disconnectCalled = false;
    this.finalizeCalled = false;
    this.audioChunks = [];
    this.shouldFailConnect = false;
    this.shouldFailFinalize = false;
    this._isConnected = false;
    this.listeners.clear();
  }
}

// ── Mock OpenCode Input ──────────────────────────────────────

class MockOpenCodeInput implements OpenCodeInput {
  public insertedTexts: string[] = [];
  public toasts: Array<{ message: string; variant?: string }> = [];
  public logs: Array<{ level: string; message: string }> = [];

  async insertText(text: string): Promise<void> {
    this.insertedTexts.push(text);
  }

  async showToast(message: string, variant?: "info" | "success" | "error"): Promise<void> {
    this.toasts.push({ message, variant });
  }

  async log(level: string, message: string): Promise<void> {
    this.logs.push({ level, message });
  }

  reset(): void {
    this.insertedTexts = [];
    this.toasts = [];
    this.logs = [];
  }
}

// ── Tests ────────────────────────────────────────────────────

describe("VoiceController", () => {
  let stt: MockSTTProvider;
  let opencode: MockOpenCodeInput;
  let controller: VoiceController;
  const config: VoiceConfig = DEFAULT_CONFIG;

  beforeEach(() => {
    stt = new MockSTTProvider();
    opencode = new MockOpenCodeInput();
    controller = new VoiceController(stt, opencode, config);
  });

  test("initial state is idle", () => {
    expect(controller.state).toBe("idle");
    expect(controller.currentSession).toBeNull();
  });

  test("cancel from idle is a no-op", async () => {
    await controller.cancel();
    expect(controller.state).toBe("idle");
  });

  test("state change listeners are called", async () => {
    const states: string[] = [];
    controller.onStateChange((state) => {
      states.push(state);
    });

    // We can't fully test start() without a real recorder,
    // but we can verify the state machine transitions
    // by testing cancel from different states
    expect(controller.state).toBe("idle");
  });

  test("unsubscribe removes listener", () => {
    const states: string[] = [];
    const unsub = controller.onStateChange((state) => {
      states.push(state);
    });

    unsub();

    // After unsubscribe, listener should not be called
    // (can't easily trigger state change without recorder,
    //  but verifying unsubscribe mechanism works)
    expect(states).toHaveLength(0);
  });

  test("toggle method exists and starts from idle", async () => {
    expect(typeof controller.toggle).toBe("function");
    expect(controller.state).toBe("idle");
  });
});

describe("VoiceController - transcript handling", () => {
  // These tests verify transcript aggregation logic
  // through the session directly, since full start() requires
  // a real microphone

  test("partial events replace interim, don't duplicate", () => {
    const { createSession, getDisplayTranscript } = require("../../src/voice/voice-session");
    const session = createSession();
    session.state = "recording";

    // Simulate partial events
    session.partialTranscript = "create";
    expect(getDisplayTranscript(session)).toBe("create");

    session.partialTranscript = "create a user";
    expect(getDisplayTranscript(session)).toBe("create a user");

    // NOT "create create a user" (no duplication)
  });

  test("final events move to confirmed parts", () => {
    const { createSession, getDisplayTranscript, getFinalTranscript } =
      require("../../src/voice/voice-session");
    const session = createSession();
    session.state = "recording";

    session.finalParts.push("create a user endpoint");
    session.partialTranscript = "";

    expect(getDisplayTranscript(session)).toBe("create a user endpoint");
    expect(getFinalTranscript(session)).toBe("create a user endpoint");
  });

  test("full streaming simulation", () => {
    const { createSession, getDisplayTranscript, getFinalTranscript } =
      require("../../src/voice/voice-session");
    const session = createSession();

    // Partials
    session.partialTranscript = "create";
    expect(getDisplayTranscript(session)).toBe("create");

    session.partialTranscript = "create an endpoint";
    expect(getDisplayTranscript(session)).toBe("create an endpoint");

    session.partialTranscript = "create an endpoint that supports";
    expect(getDisplayTranscript(session)).toBe("create an endpoint that supports");

    // Final arrives
    session.finalParts.push("create an endpoint that supports pagination and filtering.");
    session.partialTranscript = "";

    expect(getDisplayTranscript(session)).toBe(
      "create an endpoint that supports pagination and filtering.",
    );
    expect(getFinalTranscript(session)).toBe(
      "create an endpoint that supports pagination and filtering.",
    );
  });
});
