/**
 * Tests for the server plugin setup wiring.
 *
 * Regression test: transcripts used to end in a log-only stub, so nothing
 * ever reached chat. Setup must register the transcript RPC the TUI
 * subscribes to, and must release it on unload.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import plugin from "../../src/index";
import { VoiceRpc } from "../../src/rpc";

function createCtx() {
  const calls = {
    registered: [] as Array<{ definition: unknown; handlers: unknown }>,
    disposed: 0,
    tools: [] as Array<{ name: string }>,
  };
  const ctx = {
    rpc: {
      register: async (definition: unknown, handlers: unknown) => {
        calls.registered.push({ definition, handlers });
        return {
          events: { emit: async () => {} },
          dispose: async () => {
            calls.disposed += 1;
          },
        };
      },
    },
    tool: {
      transform: async (callback: (editor: { add: (tool: { name: string }) => void }) => void) => {
        callback({ add: (tool) => void calls.tools.push(tool) });
      },
    },
    event: {
      // Completes immediately so setup's background loop terminates.
      subscribe: async function* () {},
    },
  };
  return { ctx, calls };
}

describe("server setup", () => {
  test("registers the shared transcript RPC with no methods", async () => {
    const { ctx, calls } = createCtx();
    const setup = (plugin as unknown as { setup: (ctx: unknown) => Promise<unknown> }).setup;
    await setup(ctx);
    assert.equal(calls.registered.length, 1);
    assert.equal(calls.registered[0].definition, VoiceRpc);
    assert.deepEqual(calls.registered[0].handlers, {});
  });

  test("still registers the voice tool", async () => {
    const { ctx, calls } = createCtx();
    const setup = (plugin as unknown as { setup: (ctx: unknown) => Promise<unknown> }).setup;
    await setup(ctx);
    assert.ok(calls.tools.some((tool) => tool.name === "voice"));
  });

  test("cleanup disposes the RPC registration", async () => {
    const { ctx, calls } = createCtx();
    const setup = (plugin as unknown as {
      setup: (ctx: unknown) => Promise<(() => void) | void>;
    }).setup;
    const cleanup = await setup(ctx);
    assert.equal(typeof cleanup, "function");
    await (cleanup as () => void)();
    assert.equal(calls.disposed, 1);
  });
});
