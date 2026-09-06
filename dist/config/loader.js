/**
 * Configuration loader.
 *
 * Merges defaults with environment variable overrides.
 * API keys are loaded exclusively from environment variables
 * — never from project config files.
 */
import { DEFAULT_CONFIG } from "./schema";
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
export function loadConfig(overrides = {}) {
    const voice = mergeConfig(DEFAULT_CONFIG, overrides, readEnvOverrides());
    const apiKey = resolveApiKey(voice.stt.provider);
    if (voice.enabled && !apiKey) {
        throw new Error(`Voice plugin enabled but ${getApiKeyEnvVar(voice.stt.provider)} is not set. ` +
            `Set the environment variable or disable the plugin.`);
    }
    return { voice, apiKey };
}
// ── Internal helpers ───────────────────────────────────────────
function readEnvOverrides() {
    const env = process.env;
    const overrides = {};
    if (env.VOICE_ENABLED !== undefined) {
        overrides.enabled = env.VOICE_ENABLED === "true";
    }
    if (env.VOICE_MODE !== undefined) {
        overrides.mode = env.VOICE_MODE;
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
            provider: env.VOICE_STT_PROVIDER,
        };
    }
    if (env.VOICE_STT_MODEL !== undefined) {
        overrides.stt = {
            ...(overrides.stt ?? DEFAULT_CONFIG.stt),
            model: env.VOICE_STT_MODEL,
        };
    }
    if (env.VOICE_STT_LANGUAGE !== undefined) {
        overrides.stt = {
            ...(overrides.stt ?? DEFAULT_CONFIG.stt),
            language: env.VOICE_STT_LANGUAGE,
        };
    }
    if (env.WHISPER_PATH !== undefined) {
        overrides.stt = {
            ...(overrides.stt ?? DEFAULT_CONFIG.stt),
            whisperPath: env.WHISPER_PATH,
        };
    }
    if (env.WHISPER_MODEL_PATH !== undefined) {
        overrides.stt = {
            ...(overrides.stt ?? DEFAULT_CONFIG.stt),
            modelPath: env.WHISPER_MODEL_PATH,
        };
    }
    return overrides;
}
function mergeConfig(defaults, ...sources) {
    let result = { ...defaults };
    for (const source of sources) {
        if (source.enabled !== undefined)
            result = { ...result, enabled: source.enabled };
        if (source.mode !== undefined)
            result = { ...result, mode: source.mode };
        if (source.hotkey !== undefined)
            result = { ...result, hotkey: source.hotkey };
        if (source.autoSubmit !== undefined)
            result = { ...result, autoSubmit: source.autoSubmit };
        if (source.stt) {
            result = { ...result, stt: { ...result.stt, ...source.stt } };
        }
        if (source.audio) {
            result = { ...result, audio: { ...result.audio, ...source.audio } };
        }
    }
    return result;
}
function getApiKeyEnvVar(provider) {
    switch (provider) {
        case "deepgram":
            return "DEEPGRAM_API_KEY";
        case "whispercpp":
            return "";
        default:
            return `${String(provider).toUpperCase()}_API_KEY`;
    }
}
function resolveApiKey(provider) {
    if (provider === "whispercpp") {
        return "local"; // Local provider does not require a cloud API key
    }
    const envVar = getApiKeyEnvVar(provider);
    return envVar ? process.env[envVar] ?? "" : "local";
}
//# sourceMappingURL=loader.js.map