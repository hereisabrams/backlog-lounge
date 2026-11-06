import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { getEditData, HltbSessionError, submitEditData } from "./_lib/hltb.js";
import { applyToEditData, type SyncStatus } from "./_lib/hltbMap.js";
import { failure, openSession } from "./_lib/hltbSession.js";

const MAX_CHANGES = 15;
const PAUSE_MS = 600;
const STATUSES: SyncStatus[] = ["backlog", "playing", "stopped", "done"];

type Change = { submissionId: number; status: SyncStatus; score: number | null };

function readChanges(value: unknown): Change[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_CHANGES).flatMap((item) => {
    const change = item as Partial<Change>;
    const submissionId = Number(change.submissionId);
    const score = change.score == null ? null : Math.min(10, Math.max(0, Number(change.score)));
    if (!Number.isInteger(submissionId) || submissionId <= 0 || !STATUSES.includes(change.status as SyncStatus)) return [];
    if (score != null && Number.isNaN(score)) return [];

    return [{ submissionId, status: change.status as SyncStatus, score }];
  });
}

const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

/** Writes status and rating changes to the user's HowLongToBeat entries, one at a time. */
export async function POST(request: Request) {
  const caller = await verifyCaller(request);
  if (!caller) return unauthorized();

  const body = await readJson(request);
  const session = openSession(caller, body.sealed);
  if ("response" in session) return session.response;

  const changes = readChanges(body.changes);
  const results: { submissionId: number; ok: boolean }[] = [];

  try {
    for (const [index, change] of changes.entries()) {
      if (index > 0) await pause();

      try {
        const editData = await getEditData(session.cookie, change.submissionId);
        await submitEditData(session.cookie, applyToEditData(editData, change.status, change.score));
        results.push({ submissionId: change.submissionId, ok: true });
      } catch (error) {
        if (error instanceof HltbSessionError) throw error;

        console.error(`HowLongToBeat update for entry ${change.submissionId} failed`, error);
        results.push({ submissionId: change.submissionId, ok: false });
      }
    }
  } catch (error) {
    return failure(error, "HowLongToBeat update");
  }

  return json({ results });
}
