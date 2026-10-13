/**
 * Tests for the TUI transcript flow.
 *
 * Transcripts pop a review dialog immediately; dismissing keeps them pending
 * and /voice-paste reopens the review. Covered: auto-popup, esc-keeps-pending,
 * reopen via command, scoping to the window's own location, duplicate
 * suppression, and the no-pending hint.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import tuiPlugin from "../../src/tui";

// ── Mocks ────────────────────────────────────────────────────

type TranscriptHandler = (event: { data: { text: unknown }; location: { directory: string } }) => void;
type RunHandler = () => void;

function createContext(locationDir: string | undefined, dialogResults: Array<string | undefined>) {
  let handler: TranscriptHandler | null = null;
  let run: RunHandler | null = null;
  let route: { type: string; sessionID?: string } = { type: "session", sessionID: "ses_123" };
  const calls = {
    prompts: [] as Array<{ sessionID: string; text: string }>,
    toasts: [] as Array<{ title?: string; message: string }>,
    dialogValues: [] as Array<string | undefined>,
  };
  const context = {
    location: locationDir === undefined ? undefined : { directory: locationDir },
    client: {
      rpc: () => ({
        events: {
          on: (_name: string, cb: TranscriptHandler) => {
            handler = cb;
            return () => {
              handler = null;
            };
          },
        },
      }),
      session: {
        prompt: async (input: { sessionID: string; text: string }) => {
          calls.prompts.push(input);
          return {};
        },
      },
    },
    keymap: {
      layer: (factory: () => { commands: Array<{ run: RunHandler }> }) => {
        run = factory().commands[0].run;
      },
    },
    ui: {
      router: { current: () => route },
      dialog: {
        prompt: async (opts: { value?: string }) => {
          calls.dialogValues.push(opts.value);
          return dialogResults.shift();
        },
      },
      toast: {
        show: (opts: { title?: string; message: string }) => {
          calls.toasts.push(opts);
        },
      },
    },
  };
  return {
    context,
    calls,
    setRoute: (next: { type: string; sessionID?: string }) => {
      route = next;
    },
    emit: (text: unknown, directory = "/proj") => handler?.({ data: { text }, location: { directory } }),
    paste: () => run?.(),
  };
}

async function setup(ctx: unknown): Promise<void> {
  const plugin = tuiPlugin as unknown as { setup: (ctx: unknown) => Promise<unknown> };
  await plugin.setup(ctx);
}

// Let the void review() promise settle.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("tui transcript flow", () => {
  test("transcript pops the review dialog immediately", async () => {
    const { context, calls, emit } = createContext("/proj", ["do the thing"]);
    await setup(context);
    emit("  do the thing  ");
    await settle();
    assert.equal(calls.dialogValues[0], "do the thing");
    assert.deepEqual(calls.prompts, [{ sessionID: "ses_123", text: "do the thing" }]);
  });

  test("dismissed review stays pending for /voice-paste", async () => {
    const { context, calls, emit, paste } = createContext("/proj", [undefined, "later"]);
    await setup(context);
    emit("hello");
    await settle();
    assert.equal(calls.prompts.length, 0);
    paste();
    await settle();
    assert.equal(calls.dialogValues.length, 2);
    assert.deepEqual(calls.prompts, [{ sessionID: "ses_123", text: "later" }]);
  });

  test("transcripts from other locations are ignored", async () => {
    const { context, calls, emit, paste } = createContext("/proj", ["x"]);
    await setup(context);
    emit("hello", "/other");
    await settle();
    assert.equal(calls.dialogValues.length, 0);
    paste();
    await settle();
    assert.equal(calls.dialogValues.length, 0);
    assert.ok(calls.toasts.some((toast) => toast.message.includes("No voice transcript")));
  });

  test("duplicate deliveries from multiple server instances pop once", async () => {
    const { context, calls, emit } = createContext("/proj", ["hi"]);
    await setup(context);
    emit("hi");
    emit("hi");
    await settle();
    assert.equal(calls.dialogValues.length, 1);
  });

  test("empty transcripts are ignored", async () => {
    const { context, calls, emit } = createContext("/proj", ["x"]);
    await setup(context);
    emit("   ");
    await settle();
    assert.equal(calls.dialogValues.length, 0);
    assert.equal(calls.toasts.length, 0);
  });

  test("outside a session the transcript falls back to a toast", async () => {
    const { context, calls, emit, setRoute } = createContext("/proj", ["x"]);
    await setup(context);
    setRoute({ type: "home" });
    emit("hello");
    await settle();
    assert.equal(calls.prompts.length, 0);
    assert.equal(calls.toasts.length, 1);
    assert.equal(calls.toasts[0].message, "hello");
  });
});
