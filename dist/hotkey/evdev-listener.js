/**
 * Linux evdev keyboard listener.
 *
 * Reads key events straight from /dev/input/event* so global hotkeys
 * work under both X11 and Wayland (X11-based listeners only see keys
 * typed into XWayland windows on a Wayland session).
 *
 * Requires read access to the keyboard devices — on most distros that
 * means being in the `input` group:
 *   sudo usermod -aG input $USER   (then log out and back in)
 *
 * Devices are opened non-blocking and polled, so no libuv threadpool
 * threads are held hostage by blocking reads.
 */
import { closeSync, constants, openSync, readFileSync, readSync } from "fs";
const EV_KEY = 1;
const KEY_UP = 0;
const KEY_DOWN = 1;
const POLL_INTERVAL_MS = 15;
// struct input_event is { struct timeval; u16 type; u16 code; s32 value }.
// timeval is two longs: 16 bytes on 64-bit, 8 bytes on 32-bit.
const IS_64_BIT = ["x64", "arm64", "ppc64", "s390x", "riscv64", "loong64", "mips64el"].includes(process.arch);
const TIMEVAL_SIZE = IS_64_BIT ? 16 : 8;
export const INPUT_EVENT_SIZE = TIMEVAL_SIZE + 8;
// Linux input-event-codes.h → names matching node-global-key-listener's
// standard names, so the same hotkey matching works on every platform.
const KEY_NAMES = {
    1: "ESCAPE", 14: "BACKSPACE", 15: "TAB", 28: "RETURN", 57: "SPACE",
    29: "LEFT CTRL", 97: "RIGHT CTRL",
    42: "LEFT SHIFT", 54: "RIGHT SHIFT",
    56: "LEFT ALT", 100: "RIGHT ALT",
    125: "LEFT META", 126: "RIGHT META",
    58: "CAPS LOCK", 119: "PAUSE", 99: "PRINT SCREEN", 70: "SCROLL LOCK",
    110: "INS", 111: "DELETE", 102: "HOME", 107: "END", 104: "PAGE UP", 109: "PAGE DOWN",
    103: "UP ARROW", 108: "DOWN ARROW", 105: "LEFT ARROW", 106: "RIGHT ARROW",
};
[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach((code, i) => (KEY_NAMES[code] = String((i + 1) % 10)));
"QWERTYUIOP".split("").forEach((c, i) => (KEY_NAMES[16 + i] = c));
"ASDFGHJKL".split("").forEach((c, i) => (KEY_NAMES[30 + i] = c));
"ZXCVBNM".split("").forEach((c, i) => (KEY_NAMES[44 + i] = c));
for (let i = 0; i < 10; i++)
    KEY_NAMES[59 + i] = `F${i + 1}`;
KEY_NAMES[87] = "F11";
KEY_NAMES[88] = "F12";
export function evdevKeyName(code) {
    return KEY_NAMES[code];
}
/**
 * Find keyboard event devices by parsing /proc/bus/input/devices.
 * A keyboard has the `kbd` handler and supports key repeat (EV_REP),
 * which filters out power buttons, lid switches, and most mice.
 */
export function findKeyboardDevices(devicesInfo = safeRead("/proc/bus/input/devices")) {
    const EV_REP_BIT = 1 << 20;
    const devices = [];
    for (const block of devicesInfo.split(/\n\s*\n/)) {
        const handlers = block.match(/^H: Handlers=(.*)$/m)?.[1]?.split(/\s+/) ?? [];
        const evBits = parseInt(block.match(/^B: EV=([0-9a-f]+)$/m)?.[1] ?? "0", 16);
        const event = handlers.find((h) => /^event\d+$/.test(h));
        if (event && handlers.includes("kbd") && (evBits & EV_REP_BIT)) {
            devices.push(`/dev/input/${event}`);
        }
    }
    return devices;
}
/**
 * Parse raw input_event structs, returning key press/release events.
 * Auto-repeat events (value 2) are dropped.
 */
export function parseInputEvents(buf) {
    const events = [];
    for (let off = 0; off + INPUT_EVENT_SIZE <= buf.length; off += INPUT_EVENT_SIZE) {
        const type = buf.readUInt16LE(off + TIMEVAL_SIZE);
        const code = buf.readUInt16LE(off + TIMEVAL_SIZE + 2);
        const value = buf.readInt32LE(off + TIMEVAL_SIZE + 4);
        if (type === EV_KEY && (value === KEY_DOWN || value === KEY_UP)) {
            events.push({ code, down: value === KEY_DOWN });
        }
    }
    return events;
}
export class EvdevKeyboardListener {
    callbacks = new Set();
    down = {};
    fds = [];
    timer = null;
    readBuf = Buffer.alloc(INPUT_EVENT_SIZE * 64);
    addListener(callback) {
        this.callbacks.add(callback);
    }
    /**
     * Open all keyboard devices and begin polling.
     * @throws {Error} If no keyboard device could be opened.
     */
    start(devices = findKeyboardDevices()) {
        const errors = [];
        for (const device of devices) {
            try {
                this.fds.push(openSync(device, constants.O_RDONLY | constants.O_NONBLOCK));
            }
            catch (err) {
                errors.push(`${device}: ${err.code ?? String(err)}`);
            }
        }
        if (this.fds.length === 0) {
            throw new Error(devices.length === 0
                ? "No keyboard devices found in /proc/bus/input/devices"
                : `Cannot read keyboard devices (${errors.join(", ")}). ` +
                    "Add yourself to the input group: sudo usermod -aG input $USER, then log out and back in.");
        }
        this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
        this.timer.unref?.();
    }
    kill() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        for (const fd of this.fds) {
            try {
                closeSync(fd);
            }
            catch {
                // Swallow — device may already be gone
            }
        }
        this.fds = [];
        for (const key of Object.keys(this.down))
            delete this.down[key];
    }
    poll() {
        for (const fd of [...this.fds]) {
            for (;;) {
                let bytes;
                try {
                    bytes = readSync(fd, this.readBuf, 0, this.readBuf.length, null);
                }
                catch (err) {
                    const code = err.code;
                    if (code !== "EAGAIN" && code !== "EWOULDBLOCK") {
                        // Device unplugged or revoked — stop polling it
                        this.fds = this.fds.filter((f) => f !== fd);
                        try {
                            closeSync(fd);
                        }
                        catch {
                            // Swallow
                        }
                    }
                    break;
                }
                if (bytes <= 0)
                    break;
                for (const { code, down } of parseInputEvents(this.readBuf.subarray(0, bytes))) {
                    this.dispatch(code, down);
                }
            }
        }
    }
    dispatch(code, down) {
        const name = evdevKeyName(code);
        if (!name)
            return;
        this.down[name] = down;
        const event = { name, state: down ? "DOWN" : "UP" };
        for (const callback of this.callbacks) {
            try {
                callback(event, this.down);
            }
            catch {
                // Don't let a bad listener stop polling
            }
        }
    }
}
function safeRead(path) {
    try {
        return readFileSync(path, "utf8");
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=evdev-listener.js.map