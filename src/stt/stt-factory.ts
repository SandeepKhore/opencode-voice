/**
 * STT Provider Factory.
 *
 * Dynamically instantiates the requested STT provider:
 * - "deepgram" -> DeepgramProvider (Cloud live streaming STT)
 * - "whispercpp" -> WhisperCppProvider (Local offline STT)
 */

import type { STTProvider } from "./stt-provider";
import type { STTProviderName } from "../config/schema";
import { DeepgramProvider } from "./deepgram-provider";
import { WhisperCppProvider } from "./whispercpp-provider";

export function createSTTProvider(providerName: STTProviderName): STTProvider {
  switch (providerName) {
    case "deepgram":
      return new DeepgramProvider();
    case "whispercpp":
      return new WhisperCppProvider();
    default:
      throw new Error(`Unsupported STT provider: ${String(providerName)}`);
  }
}
