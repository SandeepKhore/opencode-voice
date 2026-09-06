/**
 * STT Provider Factory.
 *
 * Dynamically instantiates the requested STT provider:
 * - "deepgram" -> DeepgramProvider (Cloud live streaming STT)
 * - "whispercpp" -> WhisperCppProvider (Local offline STT)
 */
import type { STTProvider } from "./stt-provider";
import type { STTProviderName } from "../config/schema";
export declare function createSTTProvider(providerName: STTProviderName): STTProvider;
//# sourceMappingURL=stt-factory.d.ts.map