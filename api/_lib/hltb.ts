import { toEntry, type HltbEditData, type HltbEntry, type HltbListRow } from "./hltbMap.js";

// HowLongToBeat has no public API. These are the endpoints the open-source Playnite HowLongToBeat plugin
// (github.com/Lacro59/playnite-howlongtobeat-plugin, MIT) uses with the user's own session; the account owner
// confirmed written permission from Ziff Davis for this use (see README).
const BASE = "https://howlongtobeat.com";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36";

export class HltbSessionError extends Error {}

async function hltbFetch(cookie: string, path: string, init: { method?: string; json?: unknown; referer?: string; accept?: string } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Cookie: cookie,
      "User-Agent": BROWSER_UA,
      Accept: init.accept ?? "application/json, text/javascript, */*; q=0.01",
      Referer: init.referer ?? BASE,
      Origin: BASE,
      ...(init.json === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
  if (response.status === 401 || response.status === 403) {
    const body = await response.text();
    // A bot wall answers with an HTML page; an expired session answers like the API.
    if (/<html|cf-ray|just a moment/i.test(body)) throw new Error(`HowLongToBeat blocked the request [${response.status}]: ${body.slice(0, 120)}`);

    throw new HltbSessionError(`HowLongToBeat refused the session [${response.status}]`);
  }

  return response;
}

export type HltbUser = { userId: number; userName: string | null };

/** The signed-in HowLongToBeat user for this session, or a HltbSessionError when the session isn't valid. */
export async function getUser(cookie: string): Promise<HltbUser> {
  const response = await hltbFetch(cookie, "/api/user");
  const text = await response.text();
  if (!response.ok) throw new Error(`HowLongToBeat /api/user failed [${response.status}]: ${text.slice(0, 200)}`);

  let data: { data?: { user_id?: number; user_name?: string; name?: string }[] } = {};
  try {
    data = JSON.parse(text || "{}");
  } catch {
    throw new Error(`HowLongToBeat /api/user returned non-JSON: ${text.slice(0, 120)}`);
  }

  const user = data.data?.[0];
  if (!user?.user_id) throw new HltbSessionError("HowLongToBeat says this session isn't signed in");

  return { userId: user.user_id, userName: user.user_name ?? user.name ?? null };
}

export async function listGames(cookie: string, userId: number): Promise<HltbEntry[]> {
  const response = await hltbFetch(cookie, `/api/user/${userId}/games/list`, {
    method: "POST",
    json: {
      user_id: userId,
      lists: ["playing", "backlog", "replays", "custom", "custom2", "custom3", "completed", "retired"],
      set_playstyle: "comp_all",
      name: "",
      platform: "",
      storefront: "",
      sortBy: "",
      sortFlip: 0,
      view: "",
      random: 0,
      limit: 5000,
      currentUserHome: true,
    },
  });
  if (!response.ok) throw new Error(`HowLongToBeat games list failed [${response.status}]`);

  const data = (await response.json()) as { data?: { gamesList?: HltbListRow[] } };

  return (data.data?.gamesList ?? []).map(toEntry);
}

/** The edit form for one entry, read from the page's Next.js data the way the plugin does. */
export async function getEditData(cookie: string, submissionId: number): Promise<HltbEditData> {
  const response = await hltbFetch(cookie, `/submit/edit/${submissionId}`, { accept: "text/html" });
  const html = await response.text();
  const json = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error(`No edit form found for HowLongToBeat entry ${submissionId}`);

  const editData = (JSON.parse(json) as { props?: { pageProps?: { editData?: HltbEditData } } }).props?.pageProps?.editData;
  if (!editData?.userId) throw new HltbSessionError(`HowLongToBeat entry ${submissionId} isn't editable with this session`);

  return editData;
}

export async function submitEditData(cookie: string, editData: HltbEditData) {
  const submissionId = Number(editData.submissionId ?? 0);
  const response = await hltbFetch(cookie, "/api/submit", {
    method: "POST",
    json: editData,
    referer: submissionId > 0 ? `${BASE}/submit/edit/${submissionId}` : `${BASE}/submit`,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HowLongToBeat submit failed [${response.status}]: ${text.slice(0, 200)}`);

  try {
    const body = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (body.error) throw new Error(`HowLongToBeat rejected the change: ${String(body.message ?? body.error).slice(0, 200)}`);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
}
