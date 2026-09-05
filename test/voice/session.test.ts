/**
 * Tests for voice session and transcript handling.
 */

import { describe, test, expect } from "bun:test";
import {
  createSession,
  getDisplayTranscript,
  getFinalTranscript,
} from "../../src/voice/voice-session";

describe("createSession", () => {
  test("creates a session with unique ID", () => {
    const s1 = createSession();
    const s2 = createSession();

    expect(s1.id).toBeTruthy();
    expect(s2.id).toBeTruthy();
    expect(s1.id).not.toBe(s2.id);
  });

  test("initial state is idle", () => {
    const session = createSession();
    expect(session.state).toBe("idle");
  });

  test("initial transcripts are empty", () => {
    const session = createSession();
    expect(session.finalParts).toEqual([]);
    expect(session.partialTranscript).toBe("");
    expect(session.finalTranscript).toBeUndefined();
  });

  test("has a startedAt timestamp", () => {
    const before = Date.now();
    const session = createSession();
    const after = Date.now();

    expect(session.startedAt).toBeGreaterThanOrEqual(before);
    expect(session.startedAt).toBeLessThanOrEqual(after);
  });
});

describe("getDisplayTranscript", () => {
  test("returns empty string for fresh session", () => {
    const session = createSession();
    expect(getDisplayTranscript(session)).toBe("");
  });

  test("returns partial transcript when no finals", () => {
    const session = createSession();
    session.partialTranscript = "create a user";

    expect(getDisplayTranscript(session)).toBe("create a user");
  });

  test("returns final parts when no interim", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint"];

    expect(getDisplayTranscript(session)).toBe("create a user endpoint");
  });

  test("combines final parts with current interim", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint"];
    session.partialTranscript = "with pagination";

    expect(getDisplayTranscript(session)).toBe(
      "create a user endpoint with pagination",
    );
  });

  test("joins multiple final parts", () => {
    const session = createSession();
    session.finalParts = [
      "create a user endpoint",
      "with pagination",
    ];

    expect(getDisplayTranscript(session)).toBe(
      "create a user endpoint with pagination",
    );
  });

  test("replacement model: partial replaces, doesn't duplicate", () => {
    const session = createSession();

    // Simulate streaming partial updates
    session.partialTranscript = "create";
    expect(getDisplayTranscript(session)).toBe("create");

    session.partialTranscript = "create a user";
    expect(getDisplayTranscript(session)).toBe("create a user");

    session.partialTranscript = "create a user endpoint";
    expect(getDisplayTranscript(session)).toBe("create a user endpoint");

    // Final arrives — move to confirmed, clear interim
    session.finalParts.push("create a user endpoint");
    session.partialTranscript = "";
    expect(getDisplayTranscript(session)).toBe("create a user endpoint");

    // New interim starts
    session.partialTranscript = "with pagination";
    expect(getDisplayTranscript(session)).toBe(
      "create a user endpoint with pagination",
    );
  });
});

describe("getFinalTranscript", () => {
  test("returns joined final parts", () => {
    const session = createSession();
    session.finalParts = ["create a user endpoint", "with pagination"];

    expect(getFinalTranscript(session)).toBe(
      "create a user endpoint with pagination",
    );
  });

  test("prefers explicit finalTranscript if set", () => {
    const session = createSession();
    session.finalParts = ["draft text"];
    session.finalTranscript = "final override text";

    expect(getFinalTranscript(session)).toBe("final override text");
  });
});
