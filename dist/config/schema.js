/**
 * Voice plugin configuration schema.
 *
 * The configuration is intentionally extensible for future providers
 * and features (VAD, toggle mode, etc.) while keeping the V1 surface
 * minimal.
 */
export const DEFAULT_CONFIG = {
    enabled: true,
    mode: "push-to-talk",
    hotkey: "ctrl",
    stt: {
        provider: "deepgram",
        model: "nova-3",
        language: "en",
        interimResults: true,
        modelPath: "models/ggml-base.en.bin",
    },
    audio: {
        sampleRate: 16000,
        channels: 1,
    },
    vad: {
        enabled: false,
    },
    autoSubmit: false,
};
//# sourceMappingURL=schema.js.map