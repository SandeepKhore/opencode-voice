/**
 * Tests for STT provider factory.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createSTTProvider } from "../../src/stt/stt-factory";
import { DeepgramProvider } from "../../src/stt/deepgram-provider";
import { WhisperCppProvider } from "../../src/stt/whispercpp-provider";

describe("createSTTProvider", () => {
  test("instantiates DeepgramProvider for 'deepgram'", () => {
    const provider = createSTTProvider("deepgram");
    assert.ok(provider instanceof DeepgramProvider);
  });

  test("instantiates WhisperCppProvider for 'whispercpp'", () => {
    const provider = createSTTProvider("whispercpp");
    assert.ok(provider instanceof WhisperCppProvider);
  });

  test("throws error for unsupported provider name", () => {
    assert.throws(
      () => createSTTProvider("unsupported" as any),
      { message: /Unsupported STT provider/ }
    );
  });
});
