/**
 * Voice plugin error hierarchy.
 *
 * All errors recover the state machine to IDLE without requiring
 * an OpenCode restart.
 */
export declare class VoiceError extends Error {
    readonly code: string;
    constructor(code: string, message: string, options?: ErrorOptions);
}
export declare class MicrophoneUnavailableError extends VoiceError {
    constructor(message?: string);
}
export declare class MicrophonePermissionError extends VoiceError {
    constructor(message?: string);
}
export declare class MicrophoneDisconnectedError extends VoiceError {
    constructor(message?: string);
}
export declare class STTAuthenticationError extends VoiceError {
    constructor(message?: string);
}
export declare class STTConnectionError extends VoiceError {
    constructor(message?: string);
}
export declare class STTTimeoutError extends VoiceError {
    constructor(message?: string);
}
export declare class STTRateLimitError extends VoiceError {
    constructor(message?: string);
}
export declare class InvalidStateTransitionError extends VoiceError {
    constructor(from: string, to: string);
}
export declare class OpenCodeIntegrationError extends VoiceError {
    constructor(message?: string);
}
export declare class PromptInsertionError extends VoiceError {
    constructor(message?: string);
}
//# sourceMappingURL=voice-errors.d.ts.map