/**
 * Tests for STT provider factory.
 */

import { describe, test, expect } from "bun:test";
import { createSTTProvider } from "../../src/stt/stt-factory";
import { DeepgramProvider } from "../../src/stt/deepgram-provider";
import { WhisperCppProvider } from "../../src/stt/whispercpp-provider";

describe("createSTTProvider", () => {
  test("instantiates DeepgramProvider for 'deepgram'", () => {
    const provider = createSTTProvider("deepgram");
    expect(provider).toBeInstanceOf(DeepgramProvider);
  });

  test("instantiates WhisperCppProvider for 'whispercpp'", () => {
    const provider = createSTTProvider("whispercpp");
    expect(provider).toBeInstanceOf(WhisperCppProvider);
  });

  test("throws error for unsupported provider name", () => {
    expect(() => createSTTProvider("unsupported" as any)).toThrow("Unsupported STT provider");
  });
});
