import type { HltbEntry } from "../../api/_lib/hltbMap";
import type { SearchResult } from "../../api/_lib/igdbMap";
import { callApi } from "./auth";
import { normalizePlatform, type Game, type GameFields } from "./games";
import { importSyncedGame, saveSyncedGame } from "./gamesStore";

export type SyncPlan = {
  /** On HowLongToBeat, not here yet. */
  imports: HltbEntry[];
  /** HowLongToBeat has the newer status or rating. */
  pulls: { game: Game; entry: HltbEntry }[];
  /** Backlog Lounge has the newer status or rating. */
  pushes: { game: Game; entry: HltbEntry }[];
  /** Same on both sides; only the link is saved. */
  links: { game: Game; entry: HltbEntry }[];
  /** On PC from HowLongToBeat and never checked against IGDB; sync looks up the console it belongs on. */
  refiles: { game: Game; entry: HltbEntry }[];
  /** Only here; adding games to HowLongToBeat isn't part of sync yet. */
  onlyHere: Game[];
};

/** Consoles that also play another console's games, so a PS4 game can live with the PS5. */
const PLAYS: Record<string, string[]> = {
  PS5: ["PS5", "PS4"],
  "Switch 2": ["Switch 2", "Switch"],
  "Xbox Series X|S": ["Xbox Series X|S", "Xbox One", "Xbox 360"],
};

const PREFERENCE = ["PS5", "PS4", "Switch 2", "Switch", "PS3", "PS Vita", "Xbox Series X|S", "Xbox One", "Xbox 360", "3DS", "Wii U", "Wii", "PS2", "GameCube", "N64", "PS1", "SNES", "Steam Deck"];

/**
 * Picks the console a game belongs on: one the player owns that it's on (most-used first), then one that
 * plays it, then the first console from the preference list; PC only when it's the only option.
 */
export function chooseConsole(available: string[], owned: string[]): string | null {
  const consoles = owned.filter((c) => c !== "PC");
  const exact = consoles.find((c) => available.includes(c));
  if (exact) return exact;

  const compatible = consoles.find((c) => (PLAYS[c] ?? []).some((p) => available.includes(p)));
  if (compatible) return compatible;

  return PREFERENCE.find((c) => available.includes(c)) ?? available[0] ?? null;
}

/** Lowercase title without punctuation, edition words or "the", for matching games across both sides. */
export function titleKey(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[™®©]/g, "")
    .replace(/\b(the|game of the year|goty|definitive|deluxe|complete|remastered|edition)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const sameScore = (a: number | null, b: number | null) => (a ?? 0) === (b ?? 0);

/** HowLongToBeat often has no platform, or "PC", for games the player owns on a console. */
const isUnreliablePlatform = (platform: string) => !platform.trim() || normalizePlatform(platform.trim()) === "PC";

function needsConsoleCheck(game: Game, entry: HltbEntry) {
  return game.platform === "PC" && game.igdb_id == null && isUnreliablePlatform(entry.platform);
}

export function planSync(games: Game[], entries: HltbEntry[]): SyncPlan {
  const plan: SyncPlan = { imports: [], pulls: [], pushes: [], links: [], refiles: [], onlyHere: [] };
  const claimed = new Set<string>();

  const findGame = (entry: HltbEntry) =>
    games.find((g) => g.hltb_submission_id === entry.submissionId) ??
    games.find((g) => !g.hltb_submission_id && !claimed.has(g.id) && titleKey(g.title) === titleKey(entry.title));

  for (const entry of entries) {
    const game = findGame(entry);
    if (!game) {
      plan.imports.push(entry);
      continue;
    }

    claimed.add(game.id);
    if (needsConsoleCheck(game, entry)) plan.refiles.push({ game, entry });
    if (game.status === entry.status && sameScore(game.score, entry.score)) {
      if (game.hltb_submission_id !== entry.submissionId || !game.hltb_synced_at) plan.links.push({ game, entry });
      continue;
    }

    const since = game.hltb_synced_at ?? 0;
    const changedHere = game.updated_at > since;
    const changedThere = entry.updatedAt > since;
    const hereWins = changedHere && (!changedThere || game.updated_at >= entry.updatedAt);
    (hereWins ? plan.pushes : plan.pulls).push({ game, entry });
  }

  plan.onlyHere = games.filter((g) => !claimed.has(g.id) && !entries.some((e) => e.submissionId === g.hltb_submission_id));

  return plan;
}

const linkOf = (entry: HltbEntry) => ({ hltb_submission_id: entry.submissionId, hltb_game_id: entry.gameId });

export function importedFields(entry: HltbEntry): GameFields {
  return {
    title: entry.title,
    platform: normalizePlatform(entry.platform.trim()) || "PC",
    status: entry.status,
    score: entry.score,
    progress: entry.status === "done" ? 100 : 0,
    price: null,
    store: null,
    cover_url: entry.image,
    hero_url: entry.image,
    igdb_id: null,
    time_quick: null,
    time_normal: null,
    time_complete: null,
    notes: null,
  };
}

export type SyncResult = { imported: number; pulled: number; pushed: number; refiled: number; failed: number };

/** The IGDB match for a title: the same title if there is one, else the top result. */
async function lookUpGame(title: string): Promise<SearchResult | null> {
  try {
    const { results } = await callApi<{ results: SearchResult[] }>("/api/search-games", { query: title });

    return results.find((r) => titleKey(r.name) === titleKey(title)) ?? results[0] ?? null;
  } catch (error) {
    console.warn(`IGDB lookup for "${title}" failed`, error);

    return null;
  }
}

/** Console, play times and wide art from IGDB, for a game HowLongToBeat gave no platform for. */
async function igdbDetails(title: string, owned: string[], current: Pick<GameFields, "hero_url" | "time_normal">) {
  const match = await lookUpGame(title);
  if (!match) return null;

  const platform = chooseConsole([...new Set(match.platforms.map(normalizePlatform))], owned);

  return {
    ...(platform ? { platform } : {}),
    igdb_id: match.id,
    ...(current.time_normal == null && match.times
      ? { time_quick: match.times.quick, time_normal: match.times.normal, time_complete: match.times.complete }
      : {}),
    ...(!current.hero_url && match.hero ? { hero_url: match.hero } : {}),
  } satisfies Partial<GameFields>;
}

const PUSH_BATCH = 15;

/** Applies a plan: writes HowLongToBeat changes first, then saves imports, pulls and links here. */
export async function runSync(
  plan: SyncPlan,
  sealed: string,
  owned: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<SyncResult> {
  const total = plan.pushes.length + plan.imports.length + plan.pulls.length + plan.links.length + plan.refiles.length;
  let done = 0;
  const step = () => onProgress?.(++done, total);
  const result: SyncResult = { imported: 0, pulled: 0, pushed: 0, refiled: 0, failed: 0 };

  for (let start = 0; start < plan.pushes.length; start += PUSH_BATCH) {
    const batch = plan.pushes.slice(start, start + PUSH_BATCH);
    const { results } = await callApi<{ results: { submissionId: number; ok: boolean }[] }>("/api/hltb-update", {
      sealed,
      changes: batch.map(({ game, entry }) => ({ submissionId: entry.submissionId, status: game.status, score: game.score })),
    });

    for (const { game, entry } of batch) {
      const ok = results.find((r) => r.submissionId === entry.submissionId)?.ok ?? false;
      if (ok) {
        await saveSyncedGame(game.id, {}, linkOf(entry), Date.now());
        result.pushed++;
      } else {
        result.failed++;
      }
      step();
    }
  }

  for (const entry of plan.imports) {
    const fields = importedFields(entry);
    const details = isUnreliablePlatform(entry.platform) ? await igdbDetails(entry.title, owned, fields) : null;
    await importSyncedGame({ ...fields, ...details }, linkOf(entry), Date.now());
    result.imported++;
    step();
  }

  for (const { game, entry } of plan.pulls) {
    const progress = entry.status === "done" && game.progress === 0 ? 100 : game.progress;
    await saveSyncedGame(game.id, { status: entry.status, score: entry.score, progress }, linkOf(entry), Date.now());
    result.pulled++;
    step();
  }

  for (const { game, entry } of plan.refiles) {
    const details = await igdbDetails(game.title, owned, game);
    if (details) {
      // Saving igdb_id even when the game stays on PC means it isn't proposed again.
      await saveSyncedGame(game.id, details, linkOf(entry), Date.now());
      if (details.platform && details.platform !== "PC") result.refiled++;
    }
    step();
  }

  for (const { game, entry } of plan.links) {
    await saveSyncedGame(game.id, {}, linkOf(entry), Date.now());
    step();
  }

  return result;
}
