/**
 * Tests for WhisperCppProvider and WAV buffer helper.
 */

import { describe, test, expect } from "bun:test";
import { WhisperCppProvider, createWavBuffer } from "../../src/stt/whispercpp-provider";

describe("createWavBuffer", () => {
  test("creates a valid 44-byte WAV header", () => {
    const pcmData = Buffer.from([0, 0, 10, 0, 20, 0]);
    const wav = createWavBuffer(pcmData, 16000, 1, 16);

    expect(wav.length).toBe(44 + pcmData.length);
    expect(wav.subarray(0, 4).toString("utf8")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("utf8")).toBe("WAVE");
    expect(wav.subarray(12, 16).toString("utf8")).toBe("fmt ");
    expect(wav.subarray(36, 40).toString("utf8")).toBe("data");

    // Check sample rate at offset 24 (16000 = 0x3E80)
    expect(wav.readUInt32LE(24)).toBe(16000);
    // Check data length at offset 40
    expect(wav.readUInt32LE(40)).toBe(pcmData.length);
  });
});

describe("WhisperCppProvider", () => {
  test("initial state is not connected", () => {
    const provider = new WhisperCppProvider();
    expect(provider.isConnected).toBe(false);
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

    expect(provider.isConnected).toBe(true);
    expect(connectedEmitted).toBe(true);
  });

  test("sendAudio throws when not connected", async () => {
    const provider = new WhisperCppProvider();
    expect(provider.sendAudio(Buffer.from([0, 1]))).rejects.toThrow("not connected");
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

    expect(finalReceived).toBe(true);
    expect(finalText).toBe("");
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

    expect(provider.isConnected).toBe(false);
    expect(disconnectedEmitted).toBe(true);
  });
});
