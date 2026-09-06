/**
 * STT Provider Factory.
 *
 * Dynamically instantiates the requested STT provider:
 * - "deepgram" -> DeepgramProvider (Cloud live streaming STT)
 * - "whispercpp" -> WhisperCppProvider (Local offline STT)
 */
import { DeepgramProvider } from "./deepgram-provider";
import { WhisperCppProvider } from "./whispercpp-provider";
export function createSTTProvider(providerName) {
    switch (providerName) {
        case "deepgram":
            return new DeepgramProvider();
        case "whispercpp":
            return new WhisperCppProvider();
        default:
            throw new Error(`Unsupported STT provider: ${String(providerName)}`);
    }
}
//# sourceMappingURL=stt-factory.js.map