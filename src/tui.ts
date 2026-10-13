/**
 * OpenCode Voice Input Plugin — TUI entry point.
 *
 * The server owns recording and transcription but cannot touch the prompt
 * draft, so it emits each transcript as an RPC event. This plugin immediately
 * offers the transcript in a review dialog (submit / esc). Dismissing keeps
 * it as pending — /voice-paste reopens the review in the window where it
 * runs, i.e. the visible one. Events from other locations are ignored (every
 * loaded location records the same hotkey audio).
 * No JSX: dialog + toast cover the whole flow.
 */

import { Plugin } from "@opencode/plugin/tui";
import { VoiceRpc } from "./rpc";

// Server instances load per location and share one global hotkey, so the same
// transcript can arrive once per instance — only the first copy is kept.
const DUPLICATE_WINDOW_MS = 5000;

export default Plugin.define({
  id: "opencode-voice-tui",
  async setup(context) {
    const voice = context.client.rpc(VoiceRpc);
    let pending: string | null = null;
    let lastText = "";
    let lastAt = 0;
    let open = false;

    async function review(): Promise<void> {
      if (open || !pending) return;
      const route = context.ui.router.current();
      if (route.type !== "session") {
        context.ui.toast.show({ title: "Voice transcript", message: pending });
        return;
      }
      open = true;
      try {
        const confirmed = await context.ui.dialog.prompt({
          title: "Voice transcript",
          description: "Review and confirm to send to the session",
          value: pending,
        });
        if (!confirmed?.trim()) return;
        pending = null;
        await context.client.session.prompt({
          sessionID: route.sessionID,
          text: confirmed.trim(),
        });
      } finally {
        open = false;
      }
    }

    const unsubscribe = voice.events.on("transcript", (event) => {
      const raw = event.data.text;
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return;
      if (event.location.directory !== context.location?.directory) return;
      const now = Date.now();
      if (text === lastText && now - lastAt < DUPLICATE_WINDOW_MS) return;
      lastText = text;
      lastAt = now;
      pending = text;
      void review();
    });

    context.keymap.layer(() => ({
      commands: [
        {
          id: "opencode-voice.paste",
          title: "Review and send voice transcript",
          group: "Voice",
          slash: { name: "voice-paste" },
          run: () => {
            if (!pending) {
              context.ui.toast.show({ message: "No voice transcript yet — hold Ctrl and speak" });
              return;
            }
            void review();
          },
        },
      ],
    }));

    return () => unsubscribe();
  },
});
