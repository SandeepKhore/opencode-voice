/**
 * Tests for the transcript aggregator.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { TranscriptAggregator } from "../../src/ui/transcript";

describe("TranscriptAggregator", () => {
  let aggregator: TranscriptAggregator;

  beforeEach(() => {
    aggregator = new TranscriptAggregator();
  });

  test("initial state has no content", () => {
    expect(aggregator.hasContent).toBe(false);
    expect(aggregator.getDisplay()).toBe("");
    expect(aggregator.getFinal()).toBe("");
  });

  test("partial replaces, doesn't append", () => {
    aggregator.handlePartial("create");
    expect(aggregator.getDisplay()).toBe("create");

    aggregator.handlePartial("create a user");
    expect(aggregator.getDisplay()).toBe("create a user");

    aggregator.handlePartial("create a user endpoint");
    expect(aggregator.getDisplay()).toBe("create a user endpoint");
  });

  test("final moves to confirmed, clears interim", () => {
    aggregator.handlePartial("create a user endpoint");
    aggregator.handleFinal("create a user endpoint");

    expect(aggregator.getDisplay()).toBe("create a user endpoint");
    // The interim is cleared
    expect(aggregator.getFinal()).toBe("create a user endpoint");
  });

  test("multiple finals are joined", () => {
    aggregator.handleFinal("create a user endpoint");
    aggregator.handleFinal("with pagination and filtering.");

    expect(aggregator.getFinal()).toBe(
      "create a user endpoint with pagination and filtering.",
    );
  });

  test("partial + final prevents duplication", () => {
    // Simulate Deepgram streaming:
    // partial: "Create"
    // partial: "Create an endpoint"
    // partial: "Create an endpoint that"
    // partial: "Create an endpoint that supports"
    // final:   "Create an endpoint that supports pagination and filtering."

    aggregator.handlePartial("Create");
    expect(aggregator.getDisplay()).toBe("Create");

    aggregator.handlePartial("Create an endpoint");
    expect(aggregator.getDisplay()).toBe("Create an endpoint");

    aggregator.handlePartial("Create an endpoint that");
    expect(aggregator.getDisplay()).toBe("Create an endpoint that");

    aggregator.handlePartial("Create an endpoint that supports");
    expect(aggregator.getDisplay()).toBe("Create an endpoint that supports");

    aggregator.handleFinal(
      "Create an endpoint that supports pagination and filtering.",
    );
    expect(aggregator.getDisplay()).toBe(
      "Create an endpoint that supports pagination and filtering.",
    );

    // The display should NOT be:
    // "Create Create an endpoint Create an endpoint that..."
  });

  test("multi-sentence streaming", () => {
    // First sentence
    aggregator.handlePartial("Add a login page");
    aggregator.handleFinal("Add a login page.");

    // Second sentence
    aggregator.handlePartial("Use OAuth");
    expect(aggregator.getDisplay()).toBe("Add a login page. Use OAuth");

    aggregator.handlePartial("Use OAuth for authentication");
    expect(aggregator.getDisplay()).toBe(
      "Add a login page. Use OAuth for authentication",
    );

    aggregator.handleFinal("Use OAuth for authentication.");
    expect(aggregator.getFinal()).toBe(
      "Add a login page. Use OAuth for authentication.",
    );
  });

  test("empty partials and finals are handled gracefully", () => {
    aggregator.handlePartial("");
    expect(aggregator.getDisplay()).toBe("");

    aggregator.handleFinal("");
    expect(aggregator.getFinal()).toBe("");

    aggregator.handleFinal("   ");
    expect(aggregator.getFinal()).toBe("");
  });

  test("reset clears all state", () => {
    aggregator.handleFinal("some text");
    aggregator.handlePartial("interim");

    aggregator.reset();

    expect(aggregator.hasContent).toBe(false);
    expect(aggregator.getDisplay()).toBe("");
    expect(aggregator.getFinal()).toBe("");
  });

  test("hasContent is true after partial", () => {
    aggregator.handlePartial("hello");
    expect(aggregator.hasContent).toBe(true);
  });

  test("hasContent is true after final", () => {
    aggregator.handleFinal("hello");
    expect(aggregator.hasContent).toBe(true);
  });
});
