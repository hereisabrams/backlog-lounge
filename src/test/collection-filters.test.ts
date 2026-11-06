import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  applyCollectionFilters,
  isFiltered,
  type CollectionFilters,
  type Game,
} from "@/lib/games";

let n = 0;
const mk = (over: Partial<Game>): Game => ({
  id: `g${n++}`,
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
  created_at: 0,
  updated_at: 0,
  ...over,
});

const games = [
  mk({ title: "Elden Ring", platform: "PS5", status: "done", score: 9 }),
  mk({ title: "GTA V", platform: "PS5", status: "playing", score: 5 }),
  mk({ title: "Astro Bot", platform: "PS5", status: "backlog", score: null }),
  mk({ title: "Hollow Knight", platform: "Switch", status: "done", score: 8 }),
  mk({ title: "Metroid Prime", platform: "GameCube", status: "stopped", score: 3 }),
];

const titles = (f: Partial<CollectionFilters>) =>
  applyCollectionFilters(games, { ...DEFAULT_FILTERS, ...f }).map((g) => g.title);

describe("applyCollectionFilters", () => {
  it("keeps everything when no filter is set", () => {
    expect(titles({})).toHaveLength(5);
  });

  it("narrowing by console keeps only that console", () => {
    expect(titles({ console: "PS5" })).toEqual(["Elden Ring", "GTA V", "Astro Bot"]);
    expect(titles({ console: "Switch" })).toEqual(["Hollow Knight"]);
  });

  it("narrowing by status keeps only that status", () => {
    expect(titles({ status: "done" })).toEqual(["Elden Ring", "Hollow Knight"]);
    expect(titles({ status: "stopped" })).toEqual(["Metroid Prime"]);
  });

  it("a minimum score keeps games at or above it and drops unrated ones", () => {
    expect(titles({ score: 5 })).toEqual(["Elden Ring", "GTA V", "Hollow Knight"]);
    expect(titles({ score: 8 })).toEqual(["Elden Ring", "Hollow Knight"]);
    expect(titles({ score: 9 })).toEqual(["Elden Ring"]);
  });

  it("the unrated score filter keeps only games with no score", () => {
    expect(titles({ score: -1 })).toEqual(["Astro Bot"]);
  });

  it("combines console, status and score", () => {
    expect(titles({ console: "PS5", status: "done", score: 8 })).toEqual(["Elden Ring"]);
    expect(titles({ console: "PS5", status: "done", score: 10 })).toEqual([]);
  });

  it("ignores a junk score value instead of hiding the whole wall", () => {
    expect(titles({ score: Number.NaN })).toHaveLength(5);
  });
});

describe("isFiltered", () => {
  it("is false for the defaults and true once anything is narrowed", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered({ console: "all", status: "all", score: 5 })).toBe(true);
    expect(isFiltered({ console: "PS5", status: "all", score: 0 })).toBe(true);
  });
});
