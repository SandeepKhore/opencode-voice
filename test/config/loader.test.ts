/**
 * Tests for config loader.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig } from "../../src/config/loader";
import { DEFAULT_CONFIG } from "../../src/config/schema";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set required API key for most tests
    process.env.DEEPGRAM_API_KEY = "test-api-key";
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  test("returns defaults when no overrides provided", () => {
    const config = loadConfig();
    expect(config.voice).toEqual(DEFAULT_CONFIG);
    expect(config.apiKey).toBe("test-api-key");
  });

  test("merges explicit overrides with defaults", () => {
    const config = loadConfig({ mode: "toggle", hotkey: "cmd+shift+v" });
    expect(config.voice.mode).toBe("toggle");
    expect(config.voice.hotkey).toBe("cmd+shift+v");
    // Other fields unchanged
    expect(config.voice.stt.provider).toBe("deepgram");
    expect(config.voice.audio.sampleRate).toBe(16000);
  });

  test("environment variables override defaults", () => {
    process.env.VOICE_MODE = "toggle";
    process.env.VOICE_HOTKEY = "ctrl+shift+space";
    process.env.VOICE_AUTO_SUBMIT = "true";

    const config = loadConfig();
    expect(config.voice.mode).toBe("toggle");
    expect(config.voice.hotkey).toBe("ctrl+shift+space");
    expect(config.voice.autoSubmit).toBe(true);
  });

  test("throws when API key is missing and plugin is enabled", () => {
    delete process.env.DEEPGRAM_API_KEY;

    expect(() => loadConfig()).toThrow("DEEPGRAM_API_KEY");
  });

  test("does not throw when API key is missing but plugin is disabled", () => {
    delete process.env.DEEPGRAM_API_KEY;

    const config = loadConfig({ enabled: false });
    expect(config.voice.enabled).toBe(false);
    expect(config.apiKey).toBe("");
  });

  test("env VOICE_ENABLED=false disables plugin", () => {
    process.env.VOICE_ENABLED = "false";
    delete process.env.DEEPGRAM_API_KEY;

    const config = loadConfig();
    expect(config.voice.enabled).toBe(false);
  });

  test("STT model override via environment", () => {
    process.env.VOICE_STT_MODEL = "nova-2";

    const config = loadConfig();
    expect(config.voice.stt.model).toBe("nova-2");
    // Other STT fields unchanged
    expect(config.voice.stt.provider).toBe("deepgram");
    expect(config.voice.stt.language).toBe("en");
  });

  test("STT language override via environment", () => {
    process.env.VOICE_STT_LANGUAGE = "es";

    const config = loadConfig();
    expect(config.voice.stt.language).toBe("es");
  });
});
