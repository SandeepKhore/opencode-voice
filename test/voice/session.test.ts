/**
 * Tests for voice session and transcript handling.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  getDisplayTranscript,
  getFinalTranscript,
} from "../../src/voice/voice-session";

describe("createSession", () => {
  test("creates a session with unique ID", () => {
    const s1 = createSession();
    const s2 = createSession();

    assert.ok(s1.id);
    assert.ok(s2.id);
    assert.notStrictEqual(s1.id, s2.id);
  });

  test("initial state is idle", () => {
    const session = createSession();
    assert.strictEqual(session.state, "idle");
  });

  test("initial transcripts are empty", () => {
    const session = createSession();
    assert.deepStrictEqual(session.finalParts, []);
    assert.strictEqual(session.partialTranscript, "");
    assert.strictEqual(session.finalTranscript, undefined);
  });

  test("has a startedAt timestamp", () => {
    const before = Date.now();
    const session = createSession();
    const after = Date.now();

    assert.ok(session.startedAt >= before);
    assert.ok(session.startedAt <= after);
  });
});

describe("getDisplayTranscript", () => {
  test("returns empty string for fresh session", () => {
    const session = createSession();
    assert.strictEqual(getDisplayTranscript(session), "");
  });

  test("returns partial transcript when no finals", () => {
    const session = createSession();
    session.partialTranscript = "create a user";

    assert.strictEqual(getDisplayTranscript(session), "create a user");
  });

  test("returns final parts when no interim", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint"];

    assert.strictEqual(getDisplayTranscript(session), "create a user endpoint");
  });

  test("combines final parts with current interim", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint"];
    session.partialTranscript = "with pagination";

    assert.strictEqual(
      getDisplayTranscript(session),
      "create a user endpoint with pagination",
    );
  });

  test("joins multiple final parts", () => {
    const session = createSession();
    session.finalParts = [
      "create a user endpoint",
      "with pagination",
    ];

    assert.strictEqual(
      getDisplayTranscript(session),
      "create a user endpoint with pagination",
    );
  });

  test("replacement model: partial replaces, doesn't duplicate", () => {
    const session = createSession();

    // Simulate streaming partial updates
    session.partialTranscript = "create";
    assert.strictEqual(getDisplayTranscript(session), "create");

    session.partialTranscript = "create a user";
    assert.strictEqual(getDisplayTranscript(session), "create a user");

    session.partialTranscript = "create a user endpoint";
    assert.strictEqual(getDisplayTranscript(session), "create a user endpoint");

    // Final arrives — move to confirmed, clear interim
    session.finalParts.push("create a user endpoint");
    session.partialTranscript = "";
    assert.strictEqual(getDisplayTranscript(session), "create a user endpoint");

    // New interim starts
    session.partialTranscript = "with pagination";
    assert.strictEqual(
      getDisplayTranscript(session),
      "create a user endpoint with pagination",
    );
  });
});

describe("getFinalTranscript", () => {
  test("returns joined final parts", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint", "with pagination"];

    assert.strictEqual(
      getFinalTranscript(session),
      "create a user endpoint with pagination",
    );
  });

  test("prefers explicit finalTranscript if set", () => {
    const session = createSession();
    session.finalParts = ["draft text"];
    session.finalTranscript = "final override text";

    assert.strictEqual(getFinalTranscript(session), "final override text");
  });
});
