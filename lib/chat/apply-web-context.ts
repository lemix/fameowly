/**
 * Splice pre-fetched web content into the outgoing prompt.
 *
 * The content goes into the *user* turn, never the system role: it is untrusted,
 * and the system prompt must keep the higher priority. It only lives in this
 * request — the client persists the message exactly as the user typed it.
 */

import type { CoreChatMessage } from "./build-core-messages";
import type { WebContextResult } from "../contracts";

export function applyWebContext(
  system: string,
  messages: CoreChatMessage[],
  context: WebContextResult | undefined,
): { system: string; messages: CoreChatMessage[] } {
  if (!context) return { system, messages };
  const withNote = context.systemNote ? `${system}\n\n${context.systemNote}` : system;
  if (!context.contextText) return { system: withNote, messages };

  const lastUser = messages.findLastIndex((m) => m.role === "user");
  if (lastUser === -1) return { system: withNote, messages };

  const target = messages[lastUser] as Extract<CoreChatMessage, { role: "user" }>;
  const patched = [...messages];
  // Context first, question last: models weigh the end of the turn most.
  patched[lastUser] = {
    role: "user",
    content: [{ type: "text", text: context.contextText }, ...target.content],
  };

  return { system: withNote, messages: patched };
}
