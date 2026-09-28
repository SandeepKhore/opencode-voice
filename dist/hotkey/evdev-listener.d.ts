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
export interface EvdevKeyEvent {
    name: string;
    state: "DOWN" | "UP";
}
export type EvdevKeyCallback = (event: EvdevKeyEvent, down: Record<string, boolean>) => void;
export declare const INPUT_EVENT_SIZE: number;
export declare function evdevKeyName(code: number): string | undefined;
/**
 * Find keyboard event devices by parsing /proc/bus/input/devices.
 * A keyboard has the `kbd` handler and supports key repeat (EV_REP),
 * which filters out power buttons, lid switches, and most mice.
 */
export declare function findKeyboardDevices(devicesInfo?: string): string[];
/**
 * Parse raw input_event structs, returning key press/release events.
 * Auto-repeat events (value 2) are dropped.
 */
export declare function parseInputEvents(buf: Buffer): Array<{
    code: number;
    down: boolean;
}>;
export declare class EvdevKeyboardListener {
    private readonly callbacks;
    private readonly down;
    private fds;
    private timer;
    private readonly readBuf;
    addListener(callback: EvdevKeyCallback): void;
    /**
     * Open all keyboard devices and begin polling.
     * @throws {Error} If no keyboard device could be opened.
     */
    start(devices?: string[]): void;
    kill(): void;
    private poll;
    private dispatch;
}
//# sourceMappingURL=evdev-listener.d.ts.map