/**
 * Tests for the shared Voice RPC contract.
 *
 * Both the server (emit) and TUI (subscribe) sides import this definition —
 * a drift here silently breaks transcript delivery.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { VoiceRpc } from "../../src/rpc";

describe("VoiceRpc", () => {
  test("has the stable plugin RPC id", () => {
    assert.equal(VoiceRpc.id, "opencode-voice");
  });

  test("declares a transcript event carrying text", () => {
    const event = VoiceRpc.events.transcript;
    assert.ok(event);
    const schema = event.schema as {
      type: string;
      properties: { text: { type: string } };
      required: string[];
    };
    assert.equal(schema.type, "object");
    assert.equal(schema.properties.text.type, "string");
    assert.ok(schema.required.includes("text"));
  });
});
