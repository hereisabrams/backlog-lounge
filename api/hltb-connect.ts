import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { getUser, HltbSessionError } from "./_lib/hltb.js";
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
    if (error instanceof HltbSessionError) {
      return json({ error: "HowLongToBeat says that cookie isn't signed in. Sign in there, copy hltb_alive again and paste it." }, 400);
    }

    return failure(error, "HowLongToBeat connect");
  }
}
