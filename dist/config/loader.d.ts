/**
 * Configuration loader.
 *
 * Merges defaults with environment variable overrides.
 * Local-only: no API keys — transcription runs offline via whisper.cpp.
 */
import { type VoiceConfig } from "./schema";
export interface ResolvedConfig {
    /** Fully resolved voice configuration. */
    readonly voice: VoiceConfig;
    /** STT credential. Always "local" — kept for the provider call signature. */
    readonly apiKey: string;
}
/**
 * Load and validate configuration.
 *
 * Priority:
 * 1. Environment variables (highest)
 * 2. Explicit overrides parameter
 * 3. Defaults (lowest)
 */
export declare function loadConfig(overrides?: Partial<VoiceConfig>): ResolvedConfig;
//# sourceMappingURL=loader.d.ts.map