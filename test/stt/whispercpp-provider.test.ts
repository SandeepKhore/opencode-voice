/**
 * Tests for WhisperCppProvider and WAV buffer helper.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { WhisperCppProvider, createWavBuffer } from "../../src/stt/whispercpp-provider";

describe("createWavBuffer", () => {
  test("creates a valid 44-byte WAV header", () => {
    const pcmData = Buffer.from([0, 0, 10, 0, 20, 0]);
    const wav = createWavBuffer(pcmData, 16000, 1, 16);

    assert.strictEqual(wav.length, 44 + pcmData.length);
    assert.strictEqual(wav.subarray(0, 4).toString("utf8"), "RIFF");
    assert.strictEqual(wav.subarray(8, 12).toString("utf8"), "WAVE");
    assert.strictEqual(wav.subarray(12, 16).toString("utf8"), "fmt ");
    assert.strictEqual(wav.subarray(36, 40).toString("utf8"), "data");

    // Check sample rate at offset 24 (16000 = 0x3E80)
    assert.strictEqual(wav.readUInt32LE(24), 16000);
    // Check data length at offset 40
    assert.strictEqual(wav.readUInt32LE(40), pcmData.length);
  });
});

describe("WhisperCppProvider", () => {
  test("initial state is not connected", () => {
    const provider = new WhisperCppProvider();
    assert.strictEqual(provider.isConnected, false);
  });

  test("connect sets isConnected and emits connected event", async () => {
    const provider = new WhisperCppProvider();
    let connectedEmitted = false;

    provider.onEvent((event) => {
      if (event.type === "connected") connectedEmitted = true;
    });

    await provider.connect({
      model: "ggml-base.en.bin",
      language: "en",
      sampleRate: 16000,
      interimResults: false,
      apiKey: "local",
    });

    assert.strictEqual(provider.isConnected, true);
    assert.strictEqual(connectedEmitted, true);
  });

  test("sendAudio throws when not connected", async () => {
    const provider = new WhisperCppProvider();
    await assert.rejects(
      () => provider.sendAudio(Buffer.from([0, 1])),
      { message: /not connected/ }
    );
  });

  test("finalize with empty audio emits empty final event", async () => {
    const provider = new WhisperCppProvider();
    let finalReceived = false;
    let finalText = "not-called";

    provider.onEvent((event) => {
      if (event.type === "final") {
        finalReceived = true;
        finalText = event.text;
      }
    });

    await provider.connect({
      model: "ggml-base.en.bin",
      language: "en",
      sampleRate: 16000,
      interimResults: false,
      apiKey: "local",
    });

    await provider.finalize();

    assert.strictEqual(finalReceived, true);
    assert.strictEqual(finalText, "");
  });

  test("disconnect clears state and emits disconnected", async () => {
    const provider = new WhisperCppProvider();
    let disconnectedEmitted = false;

    provider.onEvent((event) => {
      if (event.type === "disconnected") disconnectedEmitted = true;
    });

    await provider.connect({
      model: "ggml-base.en.bin",
      language: "en",
      sampleRate: 16000,
      interimResults: false,
      apiKey: "local",
    });

    await provider.disconnect();

    assert.strictEqual(provider.isConnected, false);
    assert.strictEqual(disconnectedEmitted, true);
  });
});
