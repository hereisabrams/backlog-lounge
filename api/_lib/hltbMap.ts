export type SyncStatus = "backlog" | "playing" | "stopped" | "done";

/** One game on the user's HowLongToBeat lists, in Backlog Lounge terms. */
export type HltbEntry = {
  /** The user's entry ("submission") id; edits go to /submit/edit/{submissionId}. */
  submissionId: number;
  gameId: number;
  title: string;
  platform: string;
  status: SyncStatus;
  /** 0–10, or null when unrated. */
  score: number | null;
  /** Milliseconds since epoch; 0 when unknown. */
  updatedAt: number;
  image: string | null;
};

/** A row of /api/user/{id}/games/list, trimmed to the fields we use. */
export type HltbListRow = {
  id: number;
  game_id: number;
  custom_title?: string | null;
  platform?: string | null;
  list_playing?: number;
  list_backlog?: number;
  list_replay?: number;
  list_custom?: number;
  list_custom2?: number;
  list_custom3?: number;
  list_comp?: number;
  list_retired?: number;
  review_score?: number;
  date_updated?: string | null;
  game_image?: string | null;
};

/** The parts of HowLongToBeat's edit form we change; everything else is sent back untouched. */
export type HltbEditData = {
  userId?: number;
  gameId?: number;
  submissionId?: number;
  lists?: Record<string, boolean>;
  review?: { score?: number; notes?: string };
  general?: { completionDate?: { year: string; month: string; day: string } } & Record<string, unknown>;
} & Record<string, unknown>;

const SESSION_COOKIES = ["hltb_alive", "hltb_online", "hltb_view_list"];

/**
 * Accepts what the user pastes: a whole Cookie header ("a=1; hltb_alive=…"), a "hltb_alive=…" pair, or just the
 * hltb_alive value. Returns a Cookie header with only the HowLongToBeat session cookies, or null if none.
 */
export function normalizeSessionCookie(input: string): string | null {
  const text = input.trim().replace(/^cookie:\s*/i, "");
  if (!text) return null;

  // The hltb_alive value itself looks like "UID=…&U=name&T=…&S=3", so only a string naming a cookie is a header.
  const isCookieList = text.includes(";") || SESSION_COOKIES.some((name) => text.startsWith(`${name}=`));
  if (!isCookieList) return /^[\w%.\-+/=&]+$/.test(text) ? `hltb_alive=${text}` : null;

  const pairs = text
    .split(";")
    .map((part) => part.trim())
    .filter((part) => SESSION_COOKIES.includes(part.split("=")[0]!.trim()) && part.slice(part.indexOf("=") + 1).trim());

  return pairs.some((pair) => pair.startsWith("hltb_alive=")) ? pairs.join("; ") : null;
}

/** Status precedence when an entry sits on several lists: finished beats playing beats retired beats backlog. */
export function statusFromRow(row: HltbListRow): SyncStatus {
  if (row.list_comp) return "done";
  if (row.list_playing) return "playing";
  if (row.list_retired) return "stopped";

  return "backlog";
}

/** "2026-11-06 21:04:11" (UTC) → ms. */
export function parseHltbDate(value?: string | null) {
  if (!value || value.startsWith("0000")) return 0;

  const ms = Date.parse(`${value.replace(" ", "T")}Z`);

  return Number.isFinite(ms) ? ms : 0;
}

export function toEntry(row: HltbListRow): HltbEntry {
  const score = row.review_score && row.review_score > 0 ? Math.round(row.review_score / 5) / 2 : null;

  return {
    submissionId: row.id,
    gameId: row.game_id,
    title: (row.custom_title ?? "").trim() || "Untitled",
    platform: (row.platform ?? "").trim(),
    status: statusFromRow(row),
    score,
    updatedAt: parseHltbDate(row.date_updated),
    image: row.game_image ? `https://howlongtobeat.com/games/${row.game_image}` : null,
  };
}

const LIST_FOR_STATUS: Record<SyncStatus, string> = {
  playing: "playing",
  backlog: "backlog",
  done: "completed",
  stopped: "retired",
};

/**
 * Moves an entry to the list for `status` and sets the rating. Replay and custom lists the user keeps on
 * HowLongToBeat are left alone; a game marked done gets today's completion date if it had none.
 */
export function applyToEditData(editData: HltbEditData, status: SyncStatus, score: number | null, today = new Date()): HltbEditData {
  const lists = { ...(editData.lists ?? {}) };
  for (const list of Object.values(LIST_FOR_STATUS)) lists[list] = list === LIST_FOR_STATUS[status];

  const general = { ...(editData.general ?? {}) };
  const completion = general.completionDate;
  if (status === "done" && (!completion || completion.year === "0000")) {
    general.completionDate = {
      year: String(today.getUTCFullYear()),
      month: String(today.getUTCMonth() + 1).padStart(2, "0"),
      day: String(today.getUTCDate()).padStart(2, "0"),
    };
  }

  return {
    ...editData,
    lists,
    general,
    review: { ...(editData.review ?? {}), score: score == null ? 0 : Math.round(score * 10) },
  };
}
