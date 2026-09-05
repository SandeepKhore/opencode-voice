/**
 * Voice plugin error hierarchy.
 *
 * All errors recover the state machine to IDLE without requiring
 * an OpenCode restart.
 */

export class VoiceError extends Error {
  public readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VoiceError";
    this.code = code;
  }
}

// ── Microphone errors ──────────────────────────────────────────

export class MicrophoneUnavailableError extends VoiceError {
  constructor(message = "No microphone device found") {
    super("MIC_UNAVAILABLE", message);
    this.name = "MicrophoneUnavailableError";
  }
}

export class MicrophonePermissionError extends VoiceError {
  constructor(message = "Microphone permission denied") {
    super("MIC_PERMISSION", message);
    this.name = "MicrophonePermissionError";
  }
}

export class MicrophoneDisconnectedError extends VoiceError {
  constructor(message = "Microphone device disconnected") {
    super("MIC_DISCONNECTED", message);
    this.name = "MicrophoneDisconnectedError";
  }
}

// ── STT errors ─────────────────────────────────────────────────

export class STTAuthenticationError extends VoiceError {
  constructor(message = "STT authentication failed — check API key") {
    super("STT_AUTH", message);
    this.name = "STTAuthenticationError";
  }
}

export class STTConnectionError extends VoiceError {
  constructor(message = "STT connection failed") {
    super("STT_CONNECTION", message);
    this.name = "STTConnectionError";
  }
}

export class STTTimeoutError extends VoiceError {
  constructor(message = "STT request timed out") {
    super("STT_TIMEOUT", message);
    this.name = "STTTimeoutError";
  }
}

export class STTRateLimitError extends VoiceError {
  constructor(message = "STT rate limit exceeded") {
    super("STT_RATE_LIMIT", message);
    this.name = "STTRateLimitError";
  }
}

// ── State machine errors ───────────────────────────────────────

export class InvalidStateTransitionError extends VoiceError {
  constructor(from: string, to: string) {
    super(
      "INVALID_TRANSITION",
      `Invalid state transition: ${from} → ${to}`,
    );
    this.name = "InvalidStateTransitionError";
  }
}

// ── OpenCode integration errors ────────────────────────────────

export class OpenCodeIntegrationError extends VoiceError {
  constructor(message = "OpenCode integration failed") {
    super("OPENCODE_INTEGRATION", message);
    this.name = "OpenCodeIntegrationError";
  }
}

export class PromptInsertionError extends VoiceError {
  constructor(message = "Failed to insert text into OpenCode prompt") {
    super("PROMPT_INSERTION", message);
    this.name = "PromptInsertionError";
  }
}
