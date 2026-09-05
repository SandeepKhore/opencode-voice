/**
 * UI renderer.
 *
 * Connects VoiceController state changes to OpenCode toast display.
 * Subscribes to the controller and shows appropriate status.
 */

import type { VoiceController } from "../voice/voice-controller";
import type { OpenCodeInput } from "../opencode/integration";
import type { VoiceSession, VoiceState } from "../voice/voice-session";
import { getDisplayTranscript } from "../voice/voice-session";
import { getStatusDisplay } from "./voice-status";

export class VoiceRenderer {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly controller: VoiceController,
    private readonly opencode: OpenCodeInput,
  ) {}

  /**
   * Start rendering state changes as toasts.
   */
  start(): void {
    this.unsubscribe = this.controller.onStateChange(
      (state, session) => {
        this.render(state, session).catch(() => {
          // Non-critical — don't crash on render failures
        });
      },
    );
  }

  /**
   * Stop rendering.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async render(
    state: VoiceState,
    session: VoiceSession,
  ): Promise<void> {
    const display = getStatusDisplay(state, {
      interimText: getDisplayTranscript(session),
      errorMessage: session.error?.message,
    });

    if (display) {
      await this.opencode.showToast(display.message, display.variant);
    }
  }
}
