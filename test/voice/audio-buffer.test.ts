/**
 * Tests for the audio buffer.
 */

import { describe, test, expect } from "bun:test";
import { AudioBuffer } from "../../src/voice/audio-buffer";

describe("AudioBuffer", () => {
  test("stores chunks", () => {
    const buffer = new AudioBuffer();
    const chunk = Buffer.from([1, 2, 3, 4]);

    buffer.push(chunk);

    expect(buffer.length).toBe(1);
    expect(buffer.size).toBe(4);
    expect(buffer.getAll()).toHaveLength(1);
  });

  test("accumulates multiple chunks", () => {
    const buffer = new AudioBuffer();

    buffer.push(Buffer.from([1, 2]));
    buffer.push(Buffer.from([3, 4, 5]));
    buffer.push(Buffer.from([6]));

    expect(buffer.length).toBe(3);
    expect(buffer.size).toBe(6);
  });

  test("drops oldest chunks when max bytes exceeded", () => {
    const buffer = new AudioBuffer(10); // 10 byte limit

    buffer.push(Buffer.alloc(4)); // 4 bytes
    buffer.push(Buffer.alloc(4)); // 8 bytes
    buffer.push(Buffer.alloc(4)); // 12 bytes > 10, drop oldest

    expect(buffer.size).toBeLessThanOrEqual(10);
    // Should have dropped the first chunk
    expect(buffer.length).toBe(2);
  });

  test("clear zeros out all chunks", () => {
    const buffer = new AudioBuffer();
    const chunk = Buffer.from([1, 2, 3, 4]);

    buffer.push(chunk);
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.size).toBe(0);

    // Original chunk should be zeroed (security)
    expect(chunk[0]).toBe(0);
    expect(chunk[1]).toBe(0);
    expect(chunk[2]).toBe(0);
    expect(chunk[3]).toBe(0);
  });

  test("getAll returns a copy", () => {
    const buffer = new AudioBuffer();
    buffer.push(Buffer.from([1]));

    const all = buffer.getAll();
    expect(all).toHaveLength(1);

    // Modifying the copy shouldn't affect the buffer
    all.pop();
    expect(buffer.length).toBe(1);
  });

  test("handles large number of small chunks", () => {
    const buffer = new AudioBuffer(1000);

    for (let i = 0; i < 500; i++) {
      buffer.push(Buffer.alloc(10));
    }

    // Should have bounded to ~1000 bytes
    expect(buffer.size).toBeLessThanOrEqual(1000);
  });
});
