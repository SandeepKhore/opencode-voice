/**
 * Tests for the audio buffer.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { AudioBuffer } from "../../src/voice/audio-buffer";

describe("AudioBuffer", () => {
  test("stores chunks", () => {
    const buffer = new AudioBuffer();
    const chunk = Buffer.from([1, 2, 3, 4]);

    buffer.push(chunk);

    assert.strictEqual(buffer.length, 1);
    assert.strictEqual(buffer.size, 4);
    assert.strictEqual(buffer.getAll().length, 1);
  });

  test("accumulates multiple chunks", () => {
    const buffer = new AudioBuffer();

    buffer.push(Buffer.from([1, 2]));
    buffer.push(Buffer.from([3, 4, 5]));
    buffer.push(Buffer.from([6]));

    assert.strictEqual(buffer.length, 3);
    assert.strictEqual(buffer.size, 6);
  });

  test("drops oldest chunks when max bytes exceeded", () => {
    const buffer = new AudioBuffer(10); // 10 byte limit

    buffer.push(Buffer.alloc(4)); // 4 bytes
    buffer.push(Buffer.alloc(4)); // 8 bytes
    buffer.push(Buffer.alloc(4)); // 12 bytes > 10, drop oldest

    assert.ok(buffer.size <= 10);
    // Should have dropped the first chunk
    assert.strictEqual(buffer.length, 2);
  });

  test("clear zeros out all chunks", () => {
    const buffer = new AudioBuffer();
    const chunk = Buffer.from([1, 2, 3, 4]);

    buffer.push(chunk);
    buffer.clear();

    assert.strictEqual(buffer.length, 0);
    assert.strictEqual(buffer.size, 0);

    // Original chunk should be zeroed (security)
    assert.strictEqual(chunk[0], 0);
    assert.strictEqual(chunk[1], 0);
    assert.strictEqual(chunk[2], 0);
    assert.strictEqual(chunk[3], 0);
  });

  test("getAll returns a copy", () => {
    const buffer = new AudioBuffer();
    buffer.push(Buffer.from([1]));

    const all = buffer.getAll();
    assert.strictEqual(all.length, 1);

    // Modifying the copy shouldn't affect the buffer
    all.pop();
    assert.strictEqual(buffer.length, 1);
  });

  test("handles large number of small chunks", () => {
    const buffer = new AudioBuffer(1000);

    for (let i = 0; i < 500; i++) {
      buffer.push(Buffer.alloc(10));
    }

    // Should have bounded to ~1000 bytes
    assert.ok(buffer.size <= 1000);
  });
});
