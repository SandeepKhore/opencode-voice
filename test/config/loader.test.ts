/**
 * Tests for config loader.
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../../src/config/loader";
import { DEFAULT_CONFIG } from "../../src/config/schema";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all voice-related env vars to ensure clean state
    delete process.env.VOICE_ENABLED;
    delete process.env.VOICE_MODE;
    delete process.env.VOICE_HOTKEY;
    delete process.env.VOICE_AUTO_SUBMIT;
    delete process.env.VOICE_STT_MODEL;
    delete process.env.VOICE_STT_LANGUAGE;
    delete process.env.WHISPER_PATH;
    delete process.env.WHISPER_MODEL_PATH;
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  test("returns defaults when no overrides provided", () => {
    const config = loadConfig();
    assert.deepStrictEqual(config.voice, DEFAULT_CONFIG);
    assert.strictEqual(config.apiKey, "local");
  });

  test("merges explicit overrides with defaults", () => {
    const config = loadConfig({ mode: "toggle", hotkey: "cmd+shift+v" });
    assert.strictEqual(config.voice.mode, "toggle");
    assert.strictEqual(config.voice.hotkey, "cmd+shift+v");
    // Other fields unchanged
    assert.strictEqual(config.voice.audio.sampleRate, 16000);
  });

  test("environment variables override defaults", () => {
    process.env.VOICE_MODE = "toggle";
    process.env.VOICE_HOTKEY = "ctrl+shift+space";
    process.env.VOICE_AUTO_SUBMIT = "true";

    const config = loadConfig();
    assert.strictEqual(config.voice.mode, "toggle");
    assert.strictEqual(config.voice.hotkey, "ctrl+shift+space");
    assert.strictEqual(config.voice.autoSubmit, true);
  });

  test("needs no API key (local-only transcription)", () => {
    const config = loadConfig();
    assert.strictEqual(config.apiKey, "local");
  });

  test("disabled plugin still resolves local config", () => {
    const config = loadConfig({ enabled: false });
    assert.strictEqual(config.voice.enabled, false);
    assert.strictEqual(config.apiKey, "local");
  });

  test("env VOICE_ENABLED=false disables plugin", () => {
    process.env.VOICE_ENABLED = "false";

    const config = loadConfig();
    assert.strictEqual(config.voice.enabled, false);
  });

  test("STT model override via environment", () => {
    process.env.VOICE_STT_MODEL = "small.en";

    const config = loadConfig();
    assert.strictEqual(config.voice.stt.model, "small.en");
    // Other STT fields unchanged
    assert.strictEqual(config.voice.stt.language, "en");
  });

  test("STT language override via environment", () => {
    process.env.VOICE_STT_LANGUAGE = "es";

    const config = loadConfig();
    assert.strictEqual(config.voice.stt.language, "es");
  });
});
