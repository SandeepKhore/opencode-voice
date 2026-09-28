/**
 * Tests for the Linux evdev keyboard listener helpers.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  INPUT_EVENT_SIZE,
  evdevKeyName,
  findKeyboardDevices,
  parseInputEvents,
} from "../../src/hotkey/evdev-listener";

function inputEvent(type: number, code: number, value: number): Buffer {
  const buf = Buffer.alloc(INPUT_EVENT_SIZE);
  const off = INPUT_EVENT_SIZE - 8;
  buf.writeUInt16LE(type, off);
  buf.writeUInt16LE(code, off + 2);
  buf.writeInt32LE(value, off + 4);
  return buf;
}

const PROC_DEVICES = `I: Bus=0019 Vendor=0000 Product=0001 Version=0000
N: Name="Power Button"
H: Handlers=kbd event2
B: EV=3

I: Bus=0011 Vendor=0001 Product=0001 Version=ab83
N: Name="AT Translated Set 2 keyboard"
H: Handlers=sysrq kbd event3 leds
B: EV=120013

I: Bus=0003 Vendor=046d Product=4024 Version=0111
N: Name="Logitech Wireless Mouse"
H: Handlers=kbd mouse3 event8
B: EV=17

I: Bus=0003 Vendor=046d Product=4023 Version=0111
N: Name="Logitech Wireless Keyboard"
H: Handlers=sysrq kbd event7 leds
B: EV=120013
`;

describe("findKeyboardDevices", () => {
  test("returns only kbd devices that support key repeat", () => {
    assert.deepEqual(findKeyboardDevices(PROC_DEVICES), [
      "/dev/input/event3",
      "/dev/input/event7",
    ]);
  });

  test("returns empty list when nothing matches", () => {
    assert.deepEqual(findKeyboardDevices(""), []);
  });
});

describe("parseInputEvents", () => {
  test("extracts key down/up and drops repeats and non-key events", () => {
    const buf = Buffer.concat([
      inputEvent(4, 4, 29), // EV_MSC scan code
      inputEvent(1, 29, 1), // LEFT CTRL down
      inputEvent(0, 0, 0), // EV_SYN
      inputEvent(1, 29, 2), // repeat
      inputEvent(1, 29, 0), // LEFT CTRL up
    ]);
    assert.deepEqual(parseInputEvents(buf), [
      { code: 29, down: true },
      { code: 29, down: false },
    ]);
  });

  test("ignores a trailing partial event", () => {
    const buf = Buffer.concat([inputEvent(1, 57, 1), Buffer.alloc(5)]);
    assert.deepEqual(parseInputEvents(buf), [{ code: 57, down: true }]);
  });
});

describe("evdevKeyName", () => {
  test("maps codes to node-global-key-listener standard names", () => {
    assert.equal(evdevKeyName(29), "LEFT CTRL");
    assert.equal(evdevKeyName(97), "RIGHT CTRL");
    assert.equal(evdevKeyName(125), "LEFT META");
    assert.equal(evdevKeyName(57), "SPACE");
    assert.equal(evdevKeyName(2), "1");
    assert.equal(evdevKeyName(11), "0");
    assert.equal(evdevKeyName(16), "Q");
    assert.equal(evdevKeyName(47), "V");
    assert.equal(evdevKeyName(50), "M");
    assert.equal(evdevKeyName(68), "F10");
    assert.equal(evdevKeyName(88), "F12");
  });
});
