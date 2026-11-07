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
  /** Filed on PC or an unowned console only because HowLongToBeat had no real platform; sync re-files them. */
  refiles: { game: Game; entry: HltbEntry }[];
  /** Consoles the player chose (by hand or on HowLongToBeat), most games first; sync only files games onto these. */
  owned: string[];
  /** Only here; adding games to HowLongToBeat isn't part of sync yet. */
  onlyHere: Game[];
};

/** Consoles that also play another console's games, so a PS4 game can live with the PS5. */
const PLAYS: Record<string, string[]> = {
  PS5: ["PS5", "PS4"],
  "Switch 2": ["Switch 2", "Switch"],
  "Xbox Series X|S": ["Xbox Series X|S", "Xbox One", "Xbox 360"],
};

/**
 * Picks an owned console the game is on (most-used first), or one that plays it (a PS4 game on the PS5).
 * Null when the player owns nothing it runs on; games are never filed onto consoles the player doesn't have.
 */
export function chooseConsole(available: string[], owned: string[]): string | null {
  const consoles = owned.filter((c) => c !== "PC");
  const exact = consoles.find((c) => available.includes(c));
  if (exact) return exact;

  return consoles.find((c) => (PLAYS[c] ?? []).some((p) => available.includes(p))) ?? null;
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

/** Edited here after its last sync, so its console is the player's choice, not a guess. */
const isEditedSinceSync = (game: Game) => game.hltb_synced_at != null && game.updated_at > game.hltb_synced_at;

/** Consoles the player picked: games added or edited by hand, or linked games whose console HowLongToBeat names. */
export function ownedConsoles(games: Game[], entries: HltbEntry[]) {
  const counts = new Map<string, number>();
  for (const game of games) {
    const entry = entries.find((e) => e.submissionId === game.hltb_submission_id);
    const isChosen =
      !entry || isEditedSinceSync(game) || (!isUnreliablePlatform(entry.platform) && normalizePlatform(entry.platform.trim()) === game.platform);
    if (isChosen && game.platform !== "PC") counts.set(game.platform, (counts.get(game.platform) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

function needsConsoleCheck(game: Game, entry: HltbEntry, owned: string[]) {
  if (!isUnreliablePlatform(entry.platform) || isEditedSinceSync(game)) return false;
  if (game.platform === "PC") return game.igdb_id == null;

  return !owned.includes(game.platform);
}

export function planSync(games: Game[], entries: HltbEntry[]): SyncPlan {
  const owned = ownedConsoles(games, entries);
  const plan: SyncPlan = { imports: [], pulls: [], pushes: [], links: [], refiles: [], onlyHere: [], owned };
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
    if (needsConsoleCheck(game, entry, owned)) plan.refiles.push({ game, entry });
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

/**
 * The IGDB entry for a title and the owned console it goes on. Remakes share their original's title
 * (Resident Evil 4, Silent Hill 2), so every same-title result is tried, newest first.
 */
export function matchOwnedRelease(title: string, results: SearchResult[], owned: string[]) {
  const key = titleKey(title);
  const sameTitle = results
    .filter((r) => titleKey(r.name) === key)
    .sort((a, b) => (b.released ?? "").localeCompare(a.released ?? ""));
  for (const release of sameTitle) {
    const platform = chooseConsole([...new Set(release.platforms.map(normalizePlatform))], owned);
    if (platform) return { release, platform };
  }

  const fallback = sameTitle[0] ?? results[0];

  return fallback ? { release: fallback, platform: null } : null;
}

async function searchIgdb(title: string): Promise<SearchResult[]> {
  try {
    return (await callApi<{ results: SearchResult[] }>("/api/search-games", { query: title })).results;
  } catch (error) {
    console.warn(`IGDB lookup for "${title}" failed`, error);

    return [];
  }
}

/** Console, play times and wide art from IGDB. Without an owned console it files the game on PC. */
async function igdbDetails(title: string, owned: string[], current: Pick<GameFields, "hero_url" | "time_normal">) {
  const found = matchOwnedRelease(title, await searchIgdb(title), owned);
  if (!found) return null;

  const { release: match, platform } = found;

  return {
    platform: platform ?? "PC",
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
