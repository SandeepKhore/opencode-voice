/**
 * Tests for voice status display.
 */

import { describe, test, expect } from "bun:test";
import { getStatusDisplay } from "../../src/ui/voice-status";

describe("getStatusDisplay", () => {
  test("idle returns null (no display)", () => {
    expect(getStatusDisplay("idle")).toBeNull();
  });

  test("starting shows starting message", () => {
    const display = getStatusDisplay("starting");
    expect(display).not.toBeNull();
    expect(display!.message).toContain("Starting");
    expect(display!.variant).toBe("info");
  });

  test("recording shows listening with interim text", () => {
    const display = getStatusDisplay("recording", {
      interimText: "create a user endpoint",
    });
    expect(display).not.toBeNull();
    expect(display!.message).toContain("create a user endpoint");
    expect(display!.variant).toBe("info");
  });

  test("recording shows generic listening when no interim", () => {
    const display = getStatusDisplay("recording");
    expect(display).not.toBeNull();
    expect(display!.message).toContain("Listening");
    expect(display!.variant).toBe("info");
  });

  test("finalizing shows processing", () => {
    const display = getStatusDisplay("finalizing");
    expect(display).not.toBeNull();
    expect(display!.message).toContain("Processing");
    expect(display!.variant).toBe("info");
  });

  test("ready shows success", () => {
    const display = getStatusDisplay("ready");
    expect(display).not.toBeNull();
    expect(display!.message).toContain("ready");
    expect(display!.variant).toBe("success");
  });

  test("error shows error message", () => {
    const display = getStatusDisplay("error", {
      errorMessage: "Microphone not found",
    });
    expect(display).not.toBeNull();
    expect(display!.message).toContain("Microphone not found");
    expect(display!.variant).toBe("error");
  });

  test("error without message shows generic", () => {
    const display = getStatusDisplay("error");
    expect(display).not.toBeNull();
    expect(display!.message).toContain("failed");
    expect(display!.variant).toBe("error");
  });
});
