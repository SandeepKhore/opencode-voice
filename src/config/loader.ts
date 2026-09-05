/**
 * Configuration loader.
 *
 * Merges defaults with environment variable overrides.
 * API keys are loaded exclusively from environment variables
 * — never from project config files.
 */

import { DEFAULT_CONFIG, type VoiceConfig, type VoiceMode, type STTProviderName } from "./schema";

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
export function loadConfig(
  overrides: Partial<VoiceConfig> = {},
): ResolvedConfig {
  const voice = mergeConfig(DEFAULT_CONFIG, overrides, readEnvOverrides());

  const apiKey = resolveApiKey(voice.stt.provider);

  if (voice.enabled && !apiKey) {
    throw new Error(
      `Voice plugin enabled but ${getApiKeyEnvVar(voice.stt.provider)} is not set. ` +
        `Set the environment variable or disable the plugin.`,
    );
  }

  return { voice, apiKey };
}

// ── Internal helpers ───────────────────────────────────────────

function readEnvOverrides(): Partial<VoiceConfig> {
  const env = process.env;
  const overrides: Record<string, unknown> = {};

  if (env.VOICE_ENABLED !== undefined) {
    overrides.enabled = env.VOICE_ENABLED === "true";
  }
  if (env.VOICE_MODE !== undefined) {
    overrides.mode = env.VOICE_MODE as VoiceMode;
  }
  if (env.VOICE_HOTKEY !== undefined) {
    overrides.hotkey = env.VOICE_HOTKEY;
  }
  if (env.VOICE_AUTO_SUBMIT !== undefined) {
    overrides.autoSubmit = env.VOICE_AUTO_SUBMIT === "true";
  }
  if (env.VOICE_STT_PROVIDER !== undefined) {
    overrides.stt = {
      ...DEFAULT_CONFIG.stt,
      provider: env.VOICE_STT_PROVIDER as STTProviderName,
    };
  }
  if (env.VOICE_STT_MODEL !== undefined) {
    overrides.stt = {
      ...(overrides.stt as typeof DEFAULT_CONFIG.stt ?? DEFAULT_CONFIG.stt),
      model: env.VOICE_STT_MODEL,
    };
  }
  if (env.VOICE_STT_LANGUAGE !== undefined) {
    overrides.stt = {
      ...(overrides.stt as typeof DEFAULT_CONFIG.stt ?? DEFAULT_CONFIG.stt),
      language: env.VOICE_STT_LANGUAGE,
    };
  }

  return overrides as Partial<VoiceConfig>;
}

function mergeConfig(
  defaults: VoiceConfig,
  ...sources: Partial<VoiceConfig>[]
): VoiceConfig {
  let result = { ...defaults };

  for (const source of sources) {
    if (source.enabled !== undefined) result = { ...result, enabled: source.enabled };
    if (source.mode !== undefined) result = { ...result, mode: source.mode };
    if (source.hotkey !== undefined) result = { ...result, hotkey: source.hotkey };
    if (source.autoSubmit !== undefined) result = { ...result, autoSubmit: source.autoSubmit };

    if (source.stt) {
      result = { ...result, stt: { ...result.stt, ...source.stt } };
    }
    if (source.audio) {
      result = { ...result, audio: { ...result.audio, ...source.audio } };
    }
  }

  return result;
}

function getApiKeyEnvVar(provider: STTProviderName): string {
  switch (provider) {
    case "deepgram":
      return "DEEPGRAM_API_KEY";
    default:
      return `${String(provider).toUpperCase()}_API_KEY`;
  }
}

function resolveApiKey(provider: STTProviderName): string {
  return process.env[getApiKeyEnvVar(provider)] ?? "";
}
