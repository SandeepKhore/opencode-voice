/**
 * Voice controller — central orchestrator.
 *
 * Manages the state machine, coordinates recorder → STT → transcript,
 * and drives the OpenCode integration. All state transitions are
 * validated — invalid transitions throw.
 *
 * State machine:
 *   IDLE → STARTING → RECORDING → FINALIZING → READY → IDLE
 *                                             ↘ ERROR → IDLE
 *   Any active state → cancel → IDLE
 */
import type { STTProvider } from "../stt/stt-provider";
import type { VoiceConfig } from "../config/schema";
import type { OpenCodeInput } from "../opencode/integration";
import { type VoiceSession, type VoiceState } from "./voice-session";
export type StateChangeCallback = (state: VoiceState, session: VoiceSession) => void;
export declare class VoiceController {
    private readonly stt;
    private readonly opencode;
    private readonly config;
    private readonly recorder;
    private readonly audioBuffer;
    private session;
    private sttUnsubscribe;
    private stateListeners;
    constructor(stt: STTProvider, opencode: OpenCodeInput, config: VoiceConfig);
    /**
     * Current state of the voice controller.
     */
    get state(): VoiceState;
    /**
     * Current session (if any).
     */
    get currentSession(): VoiceSession | null;
    /**
     * Register a state change listener.
     * @returns Unsubscribe function.
     */
    onStateChange(callback: StateChangeCallback): () => void;
    /**
     * Start a new recording session.
     *
     * Flow: IDLE → STARTING → connect STT → start recorder → RECORDING
     */
    start(): Promise<void>;
    /**
     * Start with a pre-resolved API key.
     * This is the primary entry point called by the plugin.
     */
    startWithApiKey(apiKey: string): Promise<void>;
    /**
     * Toggle recording state.
     * - If idle, starts recording.
     * - If recording, stops and finalizes.
     * - If starting or finalizing, cancels.
     */
    toggle(apiKey?: string): Promise<void>;
    /**
     * Stop recording and finalize transcript.
     *
     * Flow: RECORDING → FINALIZING → wait for final → READY → insert → IDLE
     */
    stop(): Promise<void>;
    /**
     * Cancel the current recording from any active state.
     * Returns to IDLE without inserting transcript.
     */
    cancel(): Promise<void>;
    private transition;
    private handleAudioChunk;
    private handleSTTEvent;
    private handleError;
    private notifyStateListeners;
    private cleanup;
}
//# sourceMappingURL=voice-controller.d.ts.map