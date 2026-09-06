/**
 * OpenCode Voice Input Plugin — Entry Point
 *
 * Registers the voice input plugin with OpenCode. Initializes
 * the STT provider, audio recorder, voice controller, hotkey
 * manager, and UI renderer.
 *
 * Usage:
 *   1. Place in .opencode/plugins/ or publish to npm
 *   2. Set DEEPGRAM_API_KEY environment variable
 *   3. Start OpenCode — plugin loads automatically
 *   4. Hold Ctrl+Space to speak, release to finalize
 *   5. Review transcript in prompt, press Enter
 */
import { type Plugin } from "@opencode-ai/plugin";
export declare const VoiceInputPlugin: Plugin;
export default VoiceInputPlugin;
//# sourceMappingURL=index.d.ts.map