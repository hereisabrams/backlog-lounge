import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { getUser } from "./_lib/hltb.js";
import { normalizeSessionCookie } from "./_lib/hltbMap.js";
import { failure, notConfigured } from "./_lib/hltbSession.js";
import { isSealConfigured, seal } from "./_lib/seal.js";

/** Checks a pasted HowLongToBeat session with HowLongToBeat and returns it sealed for this account. */
export async function POST(request: Request) {
  const caller = await verifyCaller(request);
  if (!caller) return unauthorized();
  if (!isSealConfigured()) return notConfigured();

  const body = await readJson(request);
  const cookie = normalizeSessionCookie(String(body.cookie ?? "").slice(0, 8000));
  if (!cookie) return json({ error: "That doesn't look like a HowLongToBeat session cookie (hltb_alive)." }, 400);

  try {
    const user = await getUser(cookie);

    return json({ sealed: seal(cookie, caller.uid), userId: user.userId, userName: user.userName });
  } catch (error) {
    return failure(error, "HowLongToBeat connect");
  }
}
