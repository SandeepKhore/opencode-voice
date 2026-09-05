/**
 * Tests for error types.
 */

import { describe, test, expect } from "bun:test";
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
    expect(err.code).toBe("TEST");
    expect(err.message).toBe("test message");
    expect(err.name).toBe("VoiceError");
    expect(err).toBeInstanceOf(Error);
  });

  test("MicrophoneUnavailableError", () => {
    const err = new MicrophoneUnavailableError();
    expect(err.code).toBe("MIC_UNAVAILABLE");
    expect(err).toBeInstanceOf(VoiceError);
    expect(err).toBeInstanceOf(Error);
  });

  test("MicrophonePermissionError", () => {
    const err = new MicrophonePermissionError();
    expect(err.code).toBe("MIC_PERMISSION");
    expect(err).toBeInstanceOf(VoiceError);
  });

  test("MicrophoneDisconnectedError", () => {
    const err = new MicrophoneDisconnectedError();
    expect(err.code).toBe("MIC_DISCONNECTED");
  });

  test("STTAuthenticationError", () => {
    const err = new STTAuthenticationError();
    expect(err.code).toBe("STT_AUTH");
    expect(err.message).toContain("API key");
  });

  test("STTConnectionError", () => {
    const err = new STTConnectionError();
    expect(err.code).toBe("STT_CONNECTION");
  });

  test("STTTimeoutError", () => {
    const err = new STTTimeoutError();
    expect(err.code).toBe("STT_TIMEOUT");
  });

  test("STTRateLimitError", () => {
    const err = new STTRateLimitError();
    expect(err.code).toBe("STT_RATE_LIMIT");
  });

  test("InvalidStateTransitionError includes from/to", () => {
    const err = new InvalidStateTransitionError("idle", "finalizing");
    expect(err.code).toBe("INVALID_TRANSITION");
    expect(err.message).toContain("idle");
    expect(err.message).toContain("finalizing");
  });

  test("OpenCodeIntegrationError", () => {
    const err = new OpenCodeIntegrationError();
    expect(err.code).toBe("OPENCODE_INTEGRATION");
  });

  test("PromptInsertionError", () => {
    const err = new PromptInsertionError();
    expect(err.code).toBe("PROMPT_INSERTION");
  });

  test("custom error messages", () => {
    const err = new STTConnectionError("WebSocket closed unexpectedly");
    expect(err.message).toBe("WebSocket closed unexpectedly");
    expect(err.code).toBe("STT_CONNECTION");
  });
});
