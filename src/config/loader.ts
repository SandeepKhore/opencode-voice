/**
 * Configuration loader.
 *
 * Merges defaults with environment variable overrides.
 * Local-only: no API keys — transcription runs offline via whisper.cpp.
 */

import { DEFAULT_CONFIG, type VoiceConfig, type VoiceMode } from "./schema";

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
export function loadConfig(
  overrides: Partial<VoiceConfig> = {},
): ResolvedConfig {
  const voice = mergeConfig(DEFAULT_CONFIG, overrides, readEnvOverrides());

  return { voice, apiKey: "local" };
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
  if (env.WHISPER_PATH !== undefined) {
    overrides.stt = {
      ...(overrides.stt as typeof DEFAULT_CONFIG.stt ?? DEFAULT_CONFIG.stt),
      whisperPath: env.WHISPER_PATH,
    };
  }
  if (env.WHISPER_MODEL_PATH !== undefined) {
    overrides.stt = {
      ...(overrides.stt as typeof DEFAULT_CONFIG.stt ?? DEFAULT_CONFIG.stt),
      modelPath: env.WHISPER_MODEL_PATH,
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
