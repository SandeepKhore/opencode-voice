/**
 * Voice plugin configuration schema.
 *
 * The configuration is intentionally extensible for future providers
 * and features (VAD, toggle mode, etc.) while keeping the V1 surface
 * minimal.
 */

export type VoiceMode = "push-to-talk" | "toggle";

export type STTProviderName = "deepgram" | "whispercpp";

export interface STTConfig {
  /** Which provider to use: "deepgram" or "whispercpp". */
  readonly provider: STTProviderName;

  /** Provider model identifier (or GGML model name for Whisper). */
  readonly model: string;

  /** BCP-47 language code. */
  readonly language: string;

  /** Whether to receive interim (partial) transcription results. */
  readonly interimResults: boolean;

  /** Path to whisper-cli / main binary when provider is "whispercpp". */
  readonly whisperPath?: string;

  /** Path to GGML model .bin file when provider is "whispercpp". */
  readonly modelPath?: string;
}

export interface AudioConfig {
  /** Sample rate in Hz (Deepgram prefers 16000). */
  readonly sampleRate: number;

  /** Number of audio channels (1 = mono). */
  readonly channels: number;
}

export interface VADConfig {
  /** Whether VAD is enabled. V2 feature — always false in V1. */
  readonly enabled: false;
}

export interface VoiceConfig {
  /** Master enable/disable switch. */
  readonly enabled: boolean;

  /** Interaction mode. */
  readonly mode: VoiceMode;

  /** Hotkey string, e.g. "ctrl+space". */
  readonly hotkey: string;

  /** Speech-to-text configuration. */
  readonly stt: STTConfig;

  /** Audio capture configuration. */
  readonly audio: AudioConfig;

  /** Voice activity detection. V2 placeholder. */
  readonly vad: VADConfig;

  /** Whether to auto-submit the transcript (disabled by default). */
  readonly autoSubmit: boolean;
}

export const DEFAULT_CONFIG: VoiceConfig = {
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
} as const;
