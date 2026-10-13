/**
 * Shared Voice RPC definition.
 *
 * The server plugin emits `transcript` when push-to-talk finalizes; the TUI
 * plugin subscribes and inserts it into the session for review. Imported by
 * both sides so the contract can't drift. Type-only SDK import — no runtime
 * dependency on `@opencode/plugin` here.
 */

import type { Rpc } from "@opencode/plugin/rpc";

export const VoiceRpc = {
  id: "opencode-voice",
  methods: {},
  events: {
    transcript: {
      schema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
} as const satisfies Rpc.PortableDefinition;
