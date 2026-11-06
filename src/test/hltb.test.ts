import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { applyToEditData, normalizeSessionCookie, parseHltbDate, statusFromRow, toEntry, type HltbEntry } from "../../api/_lib/hltbMap";
import { seal, unseal } from "../../api/_lib/seal";
import type { Game } from "@/lib/games";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
const { planSync, titleKey, importedFields } = await import("@/lib/hltbSync");

describe("normalizeSessionCookie", () => {
  it("keeps only the HowLongToBeat session cookies from a pasted Cookie header", () => {
    expect(normalizeSessionCookie("Cookie: _ga=1; hltb_alive=abc123; consent=yes; hltb_online=1")).toBe("hltb_alive=abc123; hltb_online=1");
  });

  it("accepts a bare hltb_alive value or pair", () => {
    expect(normalizeSessionCookie("  abc%2F123  ")).toBe("hltb_alive=abc%2F123");
    expect(normalizeSessionCookie("hltb_alive=xyz")).toBe("hltb_alive=xyz");
  });

  it("rejects input without an hltb_alive session", () => {
    expect(normalizeSessionCookie("")).toBeNull();
    expect(normalizeSessionCookie("_ga=1; hltb_online=1")).toBeNull();
    expect(normalizeSessionCookie("hltb_alive=")).toBeNull();
    expect(normalizeSessionCookie("not a cookie <script>")).toBeNull();
  });
});

describe("HowLongToBeat list rows", () => {
  const row = {
    id: 9001,
    game_id: 68151,
    custom_title: " Elden Ring ",
    platform: "PlayStation 5",
    list_playing: 1,
    list_comp: 0,
    review_score: 85,
    date_updated: "2026-11-06 21:04:11",
    game_image: "68151_Elden_Ring.jpg",
  };

  it("maps a row to an entry with our status, a 0–10 score and a timestamp", () => {
    expect(toEntry(row)).toEqual({
      submissionId: 9001,
      gameId: 68151,
      title: "Elden Ring",
      platform: "PlayStation 5",
      status: "playing",
      score: 8.5,
      updatedAt: Date.UTC(2026, 10, 6, 21, 4, 11),
      image: "https://howlongtobeat.com/games/68151_Elden_Ring.jpg",
    });
  });

  it("treats a zero rating as unrated", () => {
    expect(toEntry({ ...row, review_score: 0 }).score).toBeNull();
  });

  it("picks one status when an entry is on several lists", () => {
    expect(statusFromRow({ id: 1, game_id: 1, list_playing: 1, list_comp: 1 })).toBe("done");
    expect(statusFromRow({ id: 1, game_id: 1, list_retired: 1, list_backlog: 1 })).toBe("stopped");
    expect(statusFromRow({ id: 1, game_id: 1, list_custom: 1 })).toBe("backlog");
  });

  it("reads HowLongToBeat dates as UTC and ignores empty ones", () => {
    expect(parseHltbDate("2026-01-02 03:04:05")).toBe(Date.UTC(2026, 0, 2, 3, 4, 5));
    expect(parseHltbDate("0000-00-00 00:00:00")).toBe(0);
    expect(parseHltbDate(null)).toBe(0);
  });
});

describe("applyToEditData", () => {
  const editData = {
    userId: 7,
    gameId: 68151,
    submissionId: 9001,
    lists: { playing: true, backlog: false, replay: true, custom: false, completed: false, retired: false },
    general: { completionDate: { year: "0000", month: "00", day: "00" }, progress: { hours: 40 } },
    review: { score: 0, notes: "great" },
    singlePlayer: { compMain: { time: { hours: 38 } } },
  };

  it("moves the entry to the status's list, keeps replay/custom lists and other fields", () => {
    const result = applyToEditData(editData, "done", 9, new Date(Date.UTC(2026, 10, 6)));
    expect(result.lists).toEqual({ playing: false, backlog: false, replay: true, custom: false, completed: true, retired: false });
    expect(result.general?.completionDate).toEqual({ year: "2026", month: "11", day: "06" });
    expect(result.general?.["progress"]).toEqual({ hours: 40 });
    expect(result.review).toEqual({ score: 90, notes: "great" });
    expect(result["singlePlayer"]).toEqual(editData.singlePlayer);
  });

  it("keeps an existing completion date and clears the rating when unrated", () => {
    const completed = { ...editData, general: { completionDate: { year: "2025", month: "03", day: "01" } } };
    const result = applyToEditData(completed, "stopped", null);
    expect(result.general?.completionDate).toEqual({ year: "2025", month: "03", day: "01" });
    expect(result.lists?.["retired"]).toBe(true);
    expect(result.review?.score).toBe(0);
  });
});

describe("seal", () => {
  beforeAll(() => {
    process.env.HLTB_SEAL_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a session for the same account only", () => {
    const sealed = seal("hltb_alive=secret", "uid-1");
    expect(sealed).not.toContain("secret");
    expect(unseal(sealed, "uid-1")).toBe("hltb_alive=secret");
    expect(unseal(sealed, "uid-2")).toBeNull();
  });

  it("rejects tampered or malformed values", () => {
    const [version, iv, tag, body] = seal("hltb_alive=secret", "uid-1").split(".");
    const flipped = body!.slice(0, -2) + (body!.endsWith("A") ? "BB" : "AA");
    expect(unseal([version, iv, tag, flipped].join("."), "uid-1")).toBeNull();
    expect(unseal("garbage", "uid-1")).toBeNull();
  });
});

const game = (over: Partial<Game>): Game => ({
  id: Math.random().toString(36).slice(2),
  title: "Untitled",
  platform: "PS5",
  status: "backlog",
  score: null,
  progress: 0,
  price: null,
  store: null,
  cover_url: null,
  hero_url: null,
  igdb_id: null,
  time_quick: null,
  time_normal: null,
  time_complete: null,
  notes: null,
  hltb_submission_id: null,
  hltb_game_id: null,
  hltb_synced_at: null,
  created_at: 0,
  updated_at: 1000,
  ...over,
});

const entry = (over: Partial<HltbEntry>): HltbEntry => ({
  submissionId: 1,
  gameId: 10,
  title: "Untitled",
  platform: "PlayStation 5",
  status: "backlog",
  score: null,
  updatedAt: 1000,
  image: null,
  ...over,
});

describe("titleKey", () => {
  it("matches titles across punctuation, case and edition words", () => {
    expect(titleKey("The Witcher 3: Wild Hunt – Game of the Year Edition")).toBe(titleKey("Witcher 3 Wild Hunt"));
    expect(titleKey("Pokémon™ Scarlet")).toBe("pokemon scarlet");
  });
});

describe("planSync", () => {
  it("imports entries that aren't here and reports games only here", () => {
    const onlyHere = game({ title: "Astro Bot" });
    const plan = planSync([onlyHere], [entry({ title: "Final Fantasy VII Rebirth" })]);
    expect(plan.imports.map((e) => e.title)).toEqual(["Final Fantasy VII Rebirth"]);
    expect(plan.onlyHere).toEqual([onlyHere]);
  });

  it("links a game by title the first time and only links when both sides agree", () => {
    const plan = planSync([game({ title: "Elden Ring", status: "playing" })], [entry({ title: "ELDEN RING", status: "playing" })]);
    expect(plan.links).toHaveLength(1);
    expect(plan.pushes.length + plan.pulls.length + plan.imports.length).toBe(0);
  });

  it("pushes a change made here since the last sync", () => {
    const g = game({ title: "Kingdom Hearts III", status: "done", hltb_submission_id: 5, hltb_synced_at: 2000, updated_at: 3000 });
    const plan = planSync([g], [entry({ submissionId: 5, title: "Kingdom Hearts III", status: "playing", updatedAt: 1500 })]);
    expect(plan.pushes.map((p) => p.game.id)).toEqual([g.id]);
  });

  it("pulls a change made on HowLongToBeat since the last sync", () => {
    const g = game({ title: "Hades", status: "backlog", hltb_submission_id: 6, hltb_synced_at: 2000, updated_at: 2000 });
    const plan = planSync([g], [entry({ submissionId: 6, title: "Hades", status: "done", score: 9, updatedAt: 2500 })]);
    expect(plan.pulls.map((p) => p.entry.status)).toEqual(["done"]);
  });

  it("lets the newer side win when both changed", () => {
    const g = game({ title: "Celeste", status: "done", hltb_submission_id: 7, hltb_synced_at: 2000, updated_at: 2600 });
    const newerThere = planSync([g], [entry({ submissionId: 7, title: "Celeste", status: "stopped", updatedAt: 2700 })]);
    const newerHere = planSync([g], [entry({ submissionId: 7, title: "Celeste", status: "stopped", updatedAt: 2500 })]);
    expect(newerThere.pulls).toHaveLength(1);
    expect(newerHere.pushes).toHaveLength(1);
  });

  it("never matches one game to two entries", () => {
    const plan = planSync([game({ title: "Doom" })], [entry({ submissionId: 1, title: "DOOM" }), entry({ submissionId: 2, title: "Doom" })]);
    expect(plan.links).toHaveLength(1);
    expect(plan.imports).toHaveLength(1);
  });
});

describe("importedFields", () => {
  it("brings a HowLongToBeat entry in with our console name and its art", () => {
    expect(importedFields(entry({ title: "Hades", platform: "Nintendo Switch", status: "done", score: 9, image: "https://img" }))).toMatchObject({
      title: "Hades",
      platform: "Switch",
      status: "done",
      score: 9,
      progress: 100,
      cover_url: "https://img",
    });
  });
});
