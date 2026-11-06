import { describe, expect, it } from "vitest";
import { consoleFamily, groupByConsole, normalizePlatform, toGameFields, type Game, type GameForm } from "@/lib/games";

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
  updated_at: 0,
  ...over,
});

const form = (over: Partial<GameForm>): GameForm => ({
  title: "Elden Ring",
  platform: "PS5",
  status: "backlog",
  score: "",
  progress: 0,
  price: "",
  store: "",
  cover_url: "",
  hero_url: "",
  igdb_id: null,
  time_quick: null,
  time_normal: null,
  time_complete: null,
  notes: "",
  ...over,
});

describe("consoleFamily", () => {
  it("matches known consoles exactly, ignoring case", () => {
    expect(consoleFamily("PS5")).toBe("ps");
    expect(consoleFamily("xbox 360")).toBe("xbox");
    expect(consoleFamily("GameCube")).toBe("nintendo");
    expect(consoleFamily("Dreamcast")).toBe("retro");
    expect(consoleFamily("Steam Deck")).toBe("pc");
  });

  it("falls back to name heuristics, then retro", () => {
    expect(consoleFamily("PlayStation Portable")).toBe("ps");
    expect(consoleFamily("Xbox Original")).toBe("xbox");
    expect(consoleFamily("Nintendo DS")).toBe("nintendo");
    expect(consoleFamily("macOS")).toBe("pc");
    expect(consoleFamily("Atari 2600")).toBe("retro");
  });
});

describe("normalizePlatform", () => {
  it("maps game database names to our consoles", () => {
    expect(normalizePlatform("PlayStation 5")).toBe("PS5");
    expect(normalizePlatform("Nintendo Switch")).toBe("Switch");
    expect(normalizePlatform("Xbox Series S/X")).toBe("Xbox Series X|S");
    expect(normalizePlatform("iOS")).toBe("Mobile");
    expect(normalizePlatform("Android")).toBe("Mobile");
  });

  it("keeps names it doesn't know", () => {
    expect(normalizePlatform("Atari 2600")).toBe("Atari 2600");
  });
});

describe("groupByConsole", () => {
  const consoles = groupByConsole([
    game({ platform: "Switch", status: "done", price: 20 }),
    game({ platform: "PS5", status: "done", price: 70 }),
    game({ platform: "PS5", status: "playing", price: 30.5 }),
    game({ platform: "PS5", status: "backlog" }),
  ]);

  it("orders consoles by how many games they have", () => {
    expect(consoles.map((c) => c.name)).toEqual(["PS5", "Switch"]);
  });

  it("counts finished games and totals what was spent", () => {
    expect(consoles[0]).toMatchObject({ family: "ps", done: 1, spent: 100.5 });
    expect(consoles[0]!.games).toHaveLength(3);
    expect(consoles[1]).toMatchObject({ done: 1, spent: 20 });
  });
});

describe("toGameFields", () => {
  it("marks a finished game with no progress as 100%", () => {
    expect(toGameFields(form({ status: "done", progress: 0 })).progress).toBe(100);
    expect(toGameFields(form({ status: "done", progress: 60 })).progress).toBe(60);
  });

  it("clamps the score to 0–10 in half steps and turns blank into null", () => {
    expect(toGameFields(form({ score: "12" })).score).toBe(10);
    expect(toGameFields(form({ score: "-3" })).score).toBe(0);
    expect(toGameFields(form({ score: "7.3" })).score).toBe(7.5);
    expect(toGameFields(form({ score: "" })).score).toBeNull();
  });

  it("trims text and stores blanks as null", () => {
    const fields = toGameFields(form({ title: "  Celeste ", store: "  ", notes: " ch. 3 ", price: "" }));
    expect(fields).toMatchObject({ title: "Celeste", store: null, notes: "ch. 3", price: null, cover_url: null });
  });

  it("requires a title and a console", () => {
    expect(() => toGameFields(form({ title: " " }))).toThrow("Add a title and a console");
    expect(() => toGameFields(form({ platform: "" }))).toThrow("Add a title and a console");
  });
});
