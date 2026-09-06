/**
 * Tests for error types.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  VoiceError,
  MicrophoneUnavailableError,
  MicrophonePermissionError,
  MicrophoneDisconnectedError,
  STTAuthenticationError,
  STTConnectionError,
  STTTimeoutError,
  STTRateLimitError,
  InvalidStateTransitionError,
  OpenCodeIntegrationError,
  PromptInsertionError,
} from "../../src/errors/voice-errors";

describe("VoiceError hierarchy", () => {
  test("VoiceError has code and message", () => {
    const err = new VoiceError("TEST", "test message");
    assert.strictEqual(err.code, "TEST");
    assert.strictEqual(err.message, "test message");
    assert.strictEqual(err.name, "VoiceError");
    assert.ok(err instanceof Error);
  });

  test("MicrophoneUnavailableError", () => {
    const err = new MicrophoneUnavailableError();
    assert.strictEqual(err.code, "MIC_UNAVAILABLE");
    assert.ok(err instanceof VoiceError);
    assert.ok(err instanceof Error);
  });

  test("MicrophonePermissionError", () => {
    const err = new MicrophonePermissionError();
    assert.strictEqual(err.code, "MIC_PERMISSION");
    assert.ok(err instanceof VoiceError);
  });

  test("MicrophoneDisconnectedError", () => {
    const err = new MicrophoneDisconnectedError();
    assert.strictEqual(err.code, "MIC_DISCONNECTED");
  });

  test("STTAuthenticationError", () => {
    const err = new STTAuthenticationError();
    assert.strictEqual(err.code, "STT_AUTH");
    assert.ok(err.message.includes("API key"));
  });

  test("STTConnectionError", () => {
    const err = new STTConnectionError();
    assert.strictEqual(err.code, "STT_CONNECTION");
  });

  test("STTTimeoutError", () => {
    const err = new STTTimeoutError();
    assert.strictEqual(err.code, "STT_TIMEOUT");
  });

  test("STTRateLimitError", () => {
    const err = new STTRateLimitError();
    assert.strictEqual(err.code, "STT_RATE_LIMIT");
  });

  test("InvalidStateTransitionError includes from/to", () => {
    const err = new InvalidStateTransitionError("idle", "finalizing");
    assert.strictEqual(err.code, "INVALID_TRANSITION");
    assert.ok(err.message.includes("idle"));
    assert.ok(err.message.includes("finalizing"));
  });

  test("OpenCodeIntegrationError", () => {
    const err = new OpenCodeIntegrationError();
    assert.strictEqual(err.code, "OPENCODE_INTEGRATION");
  });

  test("PromptInsertionError", () => {
    const err = new PromptInsertionError();
    assert.strictEqual(err.code, "PROMPT_INSERTION");
  });

  test("custom error messages", () => {
    const err = new STTConnectionError("WebSocket closed unexpectedly");
    assert.strictEqual(err.message, "WebSocket closed unexpectedly");
    assert.strictEqual(err.code, "STT_CONNECTION");
  });
});
