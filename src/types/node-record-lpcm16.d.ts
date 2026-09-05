declare module "node-record-lpcm16" {
  import type { Readable } from "stream";

  export interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    threshold?: number;
    recordProgram?: string;
    silence?: string;
    endOnSilence?: boolean;
    audioType?: string;
  }

  export interface Recording {
    stream(): Readable;
    stop(): void;
  }

  export function record(options?: RecordOptions): Recording;
}
