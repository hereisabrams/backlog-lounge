import { describe, expect, it } from "vitest";
import { apicalypseText, toPlayTimes, toSearchResult } from "../../api/_lib/igdbMap";
import { formatHours, hoursLeft, howLongToBeatUrl, normalizePlatform } from "@/lib/games";

describe("toSearchResult", () => {
  const game = {
    id: 119133,
    name: "Elden Ring",
    first_release_date: 1645747200,
    cover: { image_id: "co4jni" },
    artworks: [{ image_id: "ar1" }],
    screenshots: [{ image_id: "sc1" }],
    platforms: [{ name: "PlayStation 5" }, { name: "PC (Microsoft Windows)" }, {}],
  };

  it("builds portrait box art, wide art for the TV, the release date and platform names", () => {
    expect(toSearchResult(game)).toEqual({
      id: 119133,
      name: "Elden Ring",
      released: "2022-02-25",
      cover: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co4jni.jpg",
      hero: "https://images.igdb.com/igdb/image/upload/t_1080p/ar1.jpg",
      platforms: ["PlayStation 5", "PC (Microsoft Windows)"],
      times: null,
    });
  });

  it("falls back to a screenshot, then the cover, for the TV picture", () => {
    expect(toSearchResult({ ...game, artworks: [] }).hero).toBe("https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc1.jpg");
    expect(toSearchResult({ ...game, artworks: [], screenshots: [] }).hero).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co4jni.jpg",
    );
  });

  it("copes with a game that has no art or date", () => {
    expect(toSearchResult({ id: 1, name: "Obscure" })).toMatchObject({ cover: null, hero: null, released: null, platforms: [] });
  });
});

describe("toPlayTimes", () => {
  it("turns seconds into hours rounded to the half hour", () => {
    expect(toPlayTimes({ game_id: 1, hastily: 150_000, normally: 216_000, completely: 360_900 })).toEqual({
      quick: 41.5,
      normal: 60,
      complete: 100.5,
    });
  });

  it("is null when IGDB has no times", () => {
    expect(toPlayTimes(undefined)).toBeNull();
    expect(toPlayTimes({ game_id: 1 })).toBeNull();
  });
});

describe("apicalypseText", () => {
  it("removes quotes and backslashes that would break out of the query string", () => {
    expect(apicalypseText(' Zelda "; fields *; \\ ')).toBe("Zelda ; fields *;");
  });
});

describe("play time helpers", () => {
  it("formats hours and minutes", () => {
    expect(formatHours(38)).toBe("38 h");
    expect(formatHours(1.5)).toBe("1.5 h");
    expect(formatHours(0.5)).toBe("30 min");
  });

  it("estimates hours left from progress", () => {
    expect(hoursLeft({ time_normal: 60, progress: 70 })).toBe(18);
    expect(hoursLeft({ time_normal: null, progress: 70 })).toBeNull();
  });

  it("links to a HowLongToBeat search", () => {
    expect(howLongToBeatUrl("Hollow Knight")).toBe("https://howlongtobeat.com/?q=Hollow%20Knight");
  });

  it("maps IGDB platform names to our consoles", () => {
    expect(normalizePlatform("PC (Microsoft Windows)")).toBe("PC");
    expect(normalizePlatform("Nintendo GameCube")).toBe("GameCube");
    expect(normalizePlatform("Sega Mega Drive/Genesis")).toBe("Sega Genesis");
    expect(normalizePlatform("Super Nintendo Entertainment System")).toBe("SNES");
    expect(normalizePlatform("PlayStation Vita")).toBe("PS Vita");
  });
});
