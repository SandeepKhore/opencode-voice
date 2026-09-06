/**
 * Deepgram streaming STT provider.
 *
 * Implements the STTProvider interface using @deepgram/sdk
 * live transcription WebSocket API. Handles connection lifecycle,
 * event mapping, and reconnection with exponential backoff.
 */
import type { STTProvider, STTOptions } from "./stt-provider";
import type { STTEvent } from "./stt-events";
export interface LiveConnectionLike {
    send(data: Buffer | ArrayBufferLike): void;
    finish?(): void;
    close?(): void;
    requestClose?(): void;
    removeAllListeners?(): void;
    on?(event: string, listener: (...args: any[]) => void): void;
}
export declare class DeepgramProvider implements STTProvider {
    private client;
    private connection;
    private listeners;
    private _isConnected;
    private finalizeResolver;
    private finalizeTimer;
    get isConnected(): boolean;
    connect(options: STTOptions): Promise<void>;
    sendAudio(audio: Buffer): Promise<void>;
    finalize(): Promise<void>;
    disconnect(): Promise<void>;
    onEvent(callback: (event: STTEvent) => void): () => void;
    private emit;
    private attemptConnection;
    private handleTranscriptionResult;
}
//# sourceMappingURL=deepgram-provider.d.ts.map