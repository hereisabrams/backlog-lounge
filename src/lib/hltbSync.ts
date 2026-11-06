import type { HltbEntry } from "../../api/_lib/hltbMap";
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
  /** Only here; adding games to HowLongToBeat isn't part of sync yet. */
  onlyHere: Game[];
};

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

export function planSync(games: Game[], entries: HltbEntry[]): SyncPlan {
  const plan: SyncPlan = { imports: [], pulls: [], pushes: [], links: [], onlyHere: [] };
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
    platform: normalizePlatform(entry.platform) || "PC",
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

export type SyncResult = { imported: number; pulled: number; pushed: number; failed: number };

const PUSH_BATCH = 15;

/** Applies a plan: writes HowLongToBeat changes first, then saves imports, pulls and links here. */
export async function runSync(plan: SyncPlan, sealed: string, onProgress?: (done: number, total: number) => void): Promise<SyncResult> {
  const total = plan.pushes.length + plan.imports.length + plan.pulls.length + plan.links.length;
  let done = 0;
  const step = () => onProgress?.(++done, total);
  const result: SyncResult = { imported: 0, pulled: 0, pushed: 0, failed: 0 };

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
    await importSyncedGame(importedFields(entry), linkOf(entry), Date.now());
    result.imported++;
    step();
  }

  for (const { game, entry } of plan.pulls) {
    const progress = entry.status === "done" && game.progress === 0 ? 100 : game.progress;
    await saveSyncedGame(game.id, { status: entry.status, score: entry.score, progress }, linkOf(entry), Date.now());
    result.pulled++;
    step();
  }

  for (const { game, entry } of plan.links) {
    await saveSyncedGame(game.id, {}, linkOf(entry), Date.now());
    step();
  }

  return result;
}
