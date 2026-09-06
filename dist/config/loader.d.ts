/**
 * Configuration loader.
 *
 * Merges defaults with environment variable overrides.
 * API keys are loaded exclusively from environment variables
 * — never from project config files.
 */
import { type VoiceConfig } from "./schema";
export interface ResolvedConfig {
    /** Fully resolved voice configuration. */
    readonly voice: VoiceConfig;
    /** STT API key (from environment). */
    readonly apiKey: string;
}
/**
 * Load and validate configuration.
 *
 * Priority:
 * 1. Environment variables (highest)
 * 2. Explicit overrides parameter
 * 3. Defaults (lowest)
 *
 * @throws {Error} If DEEPGRAM_API_KEY is missing and the plugin is enabled.
 */
export declare function loadConfig(overrides?: Partial<VoiceConfig>): ResolvedConfig;
//# sourceMappingURL=loader.d.ts.map