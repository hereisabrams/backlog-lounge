import { json, type Caller } from "./auth.js";
import { HltbSessionError } from "./hltb.js";
import { isSealConfigured, unseal } from "./seal.js";

export const SESSION_EXPIRED = "Your HowLongToBeat session expired. Paste a fresh cookie in Account → HowLongToBeat.";

export const notConfigured = () => json({ error: "HowLongToBeat sync isn't set up on the server yet." }, 503);

/** Opens the sealed HowLongToBeat session sent by the app, or returns the response to send instead. */
export function openSession(caller: Caller, sealed: unknown): { cookie: string } | { response: Response } {
  if (!isSealConfigured()) return { response: notConfigured() };
  if (typeof sealed !== "string" || !sealed) return { response: json({ error: "Connect HowLongToBeat first.", code: "session" }, 409) };

  const cookie = unseal(sealed, caller.uid);
  if (!cookie) return { response: json({ error: SESSION_EXPIRED, code: "session" }, 409) };

  return { cookie };
}

export function failure(error: unknown, context: string) {
  if (error instanceof HltbSessionError) return json({ error: SESSION_EXPIRED, code: "session" }, 409);

  console.error(`${context} failed`, error);

  return json({ error: "HowLongToBeat didn't answer as expected. Try again in a minute." }, 502);
}
