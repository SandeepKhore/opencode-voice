/**
 * STT event types.
 *
 * Discriminated union — the rest of the application consumes these
 * without knowing the underlying provider.
 */

export type STTEvent =
  | STTPartialEvent
  | STTFinalEvent
  | STTConnectedEvent
  | STTDisconnectedEvent
  | STTErrorEvent;

export interface STTPartialEvent {
  readonly type: "partial";
  readonly text: string;
}

export interface STTFinalEvent {
  readonly type: "final";
  readonly text: string;
}

export interface STTConnectedEvent {
  readonly type: "connected";
}

export interface STTDisconnectedEvent {
  readonly type: "disconnected";
}

export interface STTErrorEvent {
  readonly type: "error";
  readonly error: Error;
}
