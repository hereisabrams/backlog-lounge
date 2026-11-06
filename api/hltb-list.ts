import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { getUser, listGames } from "./_lib/hltb.js";
import { failure, openSession } from "./_lib/hltbSession.js";

export async function POST(request: Request) {
  const caller = await verifyCaller(request);
  if (!caller) return unauthorized();

  const session = openSession(caller, (await readJson(request)).sealed);
  if ("response" in session) return session.response;

  try {
    const user = await getUser(session.cookie);

    return json({ entries: await listGames(session.cookie, user.userId) });
  } catch (error) {
    return failure(error, "HowLongToBeat list");
  }
}
