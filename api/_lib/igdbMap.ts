export type IgdbImage = { image_id?: string };

export type IgdbGame = {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: IgdbImage;
  artworks?: IgdbImage[];
  screenshots?: IgdbImage[];
  platforms?: { name?: string }[];
};

/** IGDB time-to-beat entry; times are in seconds. */
export type IgdbTimeToBeat = { game_id: number; hastily?: number; normally?: number; completely?: number };

export type PlayTimes = { quick: number | null; normal: number | null; complete: number | null };

export type SearchResult = {
  id: number;
  name: string;
  released: string | null;
  cover: string | null;
  hero: string | null;
  platforms: string[];
  times: PlayTimes | null;
};

const IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

const image = (size: string, picture?: IgdbImage) => (picture?.image_id ? `${IMAGE_BASE}/${size}/${picture.image_id}.jpg` : null);

/** Seconds to hours, rounded to the nearest half hour. */
const hours = (seconds?: number) => (seconds && seconds > 0 ? Math.max(0.5, Math.round(seconds / 1800) / 2) : null);

export function toPlayTimes(entry?: IgdbTimeToBeat): PlayTimes | null {
  if (!entry) return null;

  const times = { quick: hours(entry.hastily), normal: hours(entry.normally), complete: hours(entry.completely) };

  return times.quick ?? times.normal ?? times.complete ? times : null;
}

export function toSearchResult(game: IgdbGame, timeToBeat?: IgdbTimeToBeat): SearchResult {
  const wide = game.artworks?.[0] ? image("t_1080p", game.artworks[0]) : image("t_screenshot_huge", game.screenshots?.[0]);

  return {
    id: game.id,
    name: game.name,
    released: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : null,
    cover: image("t_cover_big_2x", game.cover),
    hero: wide ?? image("t_cover_big_2x", game.cover),
    platforms: (game.platforms ?? []).flatMap((p) => (p.name ? [p.name] : [])),
    times: toPlayTimes(timeToBeat),
  };
}

/** Makes a search term safe to place inside an Apicalypse string literal. */
export function apicalypseText(value: string) {
  return value.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
}
