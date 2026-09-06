/**
 * Tests for voice status display.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getStatusDisplay } from "../../src/ui/voice-status";

describe("getStatusDisplay", () => {
  test("idle returns null (no display)", () => {
    assert.strictEqual(getStatusDisplay("idle"), null);
  });

  test("starting shows starting message", () => {
    const display = getStatusDisplay("starting");
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("Starting"));
    assert.strictEqual(display!.variant, "info");
  });

  test("recording shows listening with interim text", () => {
    const display = getStatusDisplay("recording", {
      interimText: "create a user endpoint",
    });
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("create a user endpoint"));
    assert.strictEqual(display!.variant, "info");
  });

  test("recording shows generic listening when no interim", () => {
    const display = getStatusDisplay("recording");
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("Listening"));
    assert.strictEqual(display!.variant, "info");
  });

  test("finalizing shows processing", () => {
    const display = getStatusDisplay("finalizing");
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("Processing"));
    assert.strictEqual(display!.variant, "info");
  });

  test("ready shows success", () => {
    const display = getStatusDisplay("ready");
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("ready"));
    assert.strictEqual(display!.variant, "success");
  });

  test("error shows error message", () => {
    const display = getStatusDisplay("error", {
      errorMessage: "Microphone not found",
    });
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("Microphone not found"));
    assert.strictEqual(display!.variant, "error");
  });

  test("error without message shows generic", () => {
    const display = getStatusDisplay("error");
    assert.notStrictEqual(display, null);
    assert.ok(display!.message.includes("failed"));
    assert.strictEqual(display!.variant, "error");
  });
});
