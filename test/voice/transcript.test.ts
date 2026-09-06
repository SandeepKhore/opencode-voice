/**
 * Tests for the transcript aggregator.
 */

import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TranscriptAggregator } from "../../src/ui/transcript";

describe("TranscriptAggregator", () => {
  let aggregator: TranscriptAggregator;

  beforeEach(() => {
    aggregator = new TranscriptAggregator();
  });

  test("initial state has no content", () => {
    assert.strictEqual(aggregator.hasContent, false);
    assert.strictEqual(aggregator.getDisplay(), "");
    assert.strictEqual(aggregator.getFinal(), "");
  });

  test("partial replaces, doesn't append", () => {
    aggregator.handlePartial("create");
    assert.strictEqual(aggregator.getDisplay(), "create");

    aggregator.handlePartial("create a user");
    assert.strictEqual(aggregator.getDisplay(), "create a user");

    aggregator.handlePartial("create a user endpoint");
    assert.strictEqual(aggregator.getDisplay(), "create a user endpoint");
  });

  test("final moves to confirmed, clears interim", () => {
    aggregator.handlePartial("create a user endpoint");
    aggregator.handleFinal("create a user endpoint");

    assert.strictEqual(aggregator.getDisplay(), "create a user endpoint");
    // The interim is cleared
    assert.strictEqual(aggregator.getFinal(), "create a user endpoint");
  });

  test("multiple finals are joined", () => {
    aggregator.handleFinal("create a user endpoint");
    aggregator.handleFinal("with pagination and filtering.");

    assert.strictEqual(
      aggregator.getFinal(),
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
    assert.strictEqual(aggregator.getDisplay(), "Create");

    aggregator.handlePartial("Create an endpoint");
    assert.strictEqual(aggregator.getDisplay(), "Create an endpoint");

    aggregator.handlePartial("Create an endpoint that");
    assert.strictEqual(aggregator.getDisplay(), "Create an endpoint that");

    aggregator.handlePartial("Create an endpoint that supports");
    assert.strictEqual(aggregator.getDisplay(), "Create an endpoint that supports");

    aggregator.handleFinal(
      "Create an endpoint that supports pagination and filtering.",
    );
    assert.strictEqual(
      aggregator.getDisplay(),
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
    assert.strictEqual(aggregator.getDisplay(), "Add a login page. Use OAuth");

    aggregator.handlePartial("Use OAuth for authentication");
    assert.strictEqual(
      aggregator.getDisplay(),
      "Add a login page. Use OAuth for authentication",
    );

    aggregator.handleFinal("Use OAuth for authentication.");
    assert.strictEqual(
      aggregator.getFinal(),
      "Add a login page. Use OAuth for authentication.",
    );
  });

  test("empty partials and finals are handled gracefully", () => {
    aggregator.handlePartial("");
    assert.strictEqual(aggregator.getDisplay(), "");

    aggregator.handleFinal("");
    assert.strictEqual(aggregator.getFinal(), "");

    aggregator.handleFinal("   ");
    assert.strictEqual(aggregator.getFinal(), "");
  });

  test("reset clears all state", () => {
    aggregator.handleFinal("some text");
    aggregator.handlePartial("interim");

    aggregator.reset();

    assert.strictEqual(aggregator.hasContent, false);
    assert.strictEqual(aggregator.getDisplay(), "");
    assert.strictEqual(aggregator.getFinal(), "");
  });

  test("hasContent is true after partial", () => {
    aggregator.handlePartial("hello");
    assert.strictEqual(aggregator.hasContent, true);
  });

  test("hasContent is true after final", () => {
    aggregator.handleFinal("hello");
    assert.strictEqual(aggregator.hasContent, true);
  });
});
