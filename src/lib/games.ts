export type GameStatus = "backlog" | "playing" | "stopped" | "done";

export type Game = {
  id: string;
  title: string;
  platform: string;
  status: GameStatus;
  score: number | null;
  progress: number;
  price: number | null;
  store: string | null;
  /** Box art: portrait when we found it, otherwise the game's key art. */
  cover_url: string | null;
  /** Wide key art or a screenshot, shown on the TV. */
  hero_url: string | null;
  igdb_id: number | null;
  /** Hours to beat from IGDB: rushed, normal, 100%. */
  time_quick: number | null;
  time_normal: number | null;
  time_complete: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

export const STATUSES: { value: GameStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "playing", label: "Playing" },
  { value: "stopped", label: "Stopped" },
  { value: "done", label: "Done" },
];

export const STATUS_CLASS: Record<GameStatus, string> = {
  backlog: "bg-status-backlog",
  playing: "bg-status-playing",
  stopped: "bg-status-stopped",
  done: "bg-status-done",
};

export function isGameStatus(value: unknown): value is GameStatus {
  return STATUSES.some((s) => s.value === value);
}

export type ConsoleFamily = "ps" | "xbox" | "nintendo" | "pc" | "retro";

export const CONSOLES: { name: string; family: ConsoleFamily }[] = [
  { name: "PS5", family: "ps" },
  { name: "PS4", family: "ps" },
  { name: "PS3", family: "ps" },
  { name: "PS2", family: "ps" },
  { name: "PS1", family: "ps" },
  { name: "PS Vita", family: "ps" },
  { name: "Xbox Series X|S", family: "xbox" },
  { name: "Xbox One", family: "xbox" },
  { name: "Xbox 360", family: "xbox" },
  { name: "Switch 2", family: "nintendo" },
  { name: "Switch", family: "nintendo" },
  { name: "Wii U", family: "nintendo" },
  { name: "Wii", family: "nintendo" },
  { name: "3DS", family: "nintendo" },
  { name: "GameCube", family: "nintendo" },
  { name: "N64", family: "nintendo" },
  { name: "SNES", family: "nintendo" },
  { name: "PC", family: "pc" },
  { name: "Steam Deck", family: "pc" },
  { name: "Mobile", family: "pc" },
  { name: "Sega Genesis", family: "retro" },
  { name: "Dreamcast", family: "retro" },
];

export function consoleFamily(platform: string): ConsoleFamily {
  const hit = CONSOLES.find((c) => c.name.toLowerCase() === platform.toLowerCase());
  if (hit) return hit.family;

  const p = platform.toLowerCase();
  if (p.includes("playstation") || p.startsWith("ps")) return "ps";
  if (p.includes("xbox")) return "xbox";
  if (p.includes("nintendo") || p.includes("switch") || p.includes("wii") || p.includes("ds")) return "nintendo";
  if (p.includes("pc") || p.includes("mac") || p.includes("linux") || p.includes("ios") || p.includes("android")) return "pc";

  return "retro";
}

export const FAMILY_BG: Record<ConsoleFamily, string> = {
  ps: "bg-console-ps",
  xbox: "bg-console-xbox",
  nintendo: "bg-console-nintendo",
  pc: "bg-console-pc",
  retro: "bg-console-retro",
};

const GAME_DB_PLATFORMS: Record<string, string> = {
  "PlayStation 5": "PS5",
  "PlayStation 4": "PS4",
  "PlayStation 3": "PS3",
  "PlayStation 2": "PS2",
  PlayStation: "PS1",
  "PS Vita": "PS Vita",
  "PlayStation Vita": "PS Vita",
  "Xbox Series S/X": "Xbox Series X|S",
  "Xbox Series X|S": "Xbox Series X|S",
  "Xbox One": "Xbox One",
  "Xbox 360": "Xbox 360",
  "Nintendo Switch 2": "Switch 2",
  "Nintendo Switch": "Switch",
  "Wii U": "Wii U",
  Wii: "Wii",
  "Nintendo 3DS": "3DS",
  GameCube: "GameCube",
  "Nintendo GameCube": "GameCube",
  "Nintendo 64": "N64",
  SNES: "SNES",
  "Super Nintendo Entertainment System": "SNES",
  PC: "PC",
  "PC (Microsoft Windows)": "PC",
  Genesis: "Sega Genesis",
  "Sega Mega Drive/Genesis": "Sega Genesis",
  Dreamcast: "Dreamcast",
  iOS: "Mobile",
  Android: "Mobile",
};

/** Map a game database platform name (IGDB, or RAWG for older entries) to our console name. */
export function normalizePlatform(name: string): string {
  return GAME_DB_PLATFORMS[name] ?? name;
}

export type ConsoleSummary = {
  name: string;
  family: ConsoleFamily;
  games: Game[];
  done: number;
  spent: number;
};

export function groupByConsole(games: Game[]): ConsoleSummary[] {
  const byPlatform = new Map<string, Game[]>();
  for (const game of games) {
    byPlatform.set(game.platform, [...(byPlatform.get(game.platform) ?? []), game]);
  }

  return [...byPlatform.entries()]
    .map(([name, list]) => ({
      name,
      family: consoleFamily(name),
      games: list,
      done: list.filter((g) => g.status === "done").length,
      spent: list.reduce((sum, g) => sum + Number(g.price ?? 0), 0),
    }))
    .sort((a, b) => b.games.length - a.games.length);
}

export type CollectionFilters = {
  /** "all" or a console name. */
  console: string;
  /** "all" or a GameStatus value. */
  status: string;
  /** 0 = any, -1 = unrated, anything else = minimum score. */
  score: number;
};

export const DEFAULT_FILTERS: CollectionFilters = { console: "all", status: "all", score: 0 };

export const SCORE_FILTERS: { value: number; label: string }[] = [
  { value: 0, label: "Any" },
  { value: -1, label: "Unrated" },
  { value: 1, label: "1+" },
  { value: 5, label: "5+" },
  { value: 8, label: "8+" },
];

export function isFiltered(f: CollectionFilters): boolean {
  return f.console !== DEFAULT_FILTERS.console || f.status !== DEFAULT_FILTERS.status || f.score !== DEFAULT_FILTERS.score;
}

/** Narrow the collection by console, status and score. Unknown values are ignored, never crash. */
export function applyCollectionFilters(games: Game[], f: CollectionFilters): Game[] {
  return games.filter((g) => {
    if (f.console && f.console !== "all" && g.platform !== f.console) return false;
    if (f.status && f.status !== "all" && g.status !== f.status) return false;
    if (f.score === -1) return g.score == null;
    if (f.score > 0 && (g.score == null || Number(g.score) < f.score)) return false;

    return true;
  });
}

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export type GameForm = {
  title: string;
  platform: string;
  status: GameStatus;
  score: string;
  progress: number;
  price: string;
  store: string;
  cover_url: string;
  hero_url: string;
  igdb_id: number | null;
  time_quick: number | null;
  time_normal: number | null;
  time_complete: number | null;
  notes: string;
};

export type GameFields = Omit<Game, "id" | "created_at" | "updated_at">;

const blankToNull = (value: string) => value.trim() || null;

/** The save rules: trims text, blank → null, score clamped 0–10, done with no progress → 100%. */
export function toGameFields(form: GameForm): GameFields {
  const title = form.title.trim();
  const platform = form.platform.trim();
  if (!title || !platform) throw new Error("Add a title and a console");

  const score = form.score.trim() === "" ? null : Number(form.score);
  const price = form.price.trim() === "" ? null : Number(form.price);

  return {
    title,
    platform,
    status: form.status,
    score: score == null || Number.isNaN(score) ? null : Math.min(10, Math.max(0, Math.round(score * 2) / 2)),
    progress: form.status === "done" && form.progress === 0 ? 100 : Math.min(100, Math.max(0, Math.round(form.progress))),
    price: price == null || Number.isNaN(price) ? null : Math.max(0, price),
    store: blankToNull(form.store),
    cover_url: blankToNull(form.cover_url),
    hero_url: blankToNull(form.hero_url),
    igdb_id: form.igdb_id,
    time_quick: form.time_quick,
    time_normal: form.time_normal,
    time_complete: form.time_complete,
    notes: blankToNull(form.notes),
  };
}

/** "38 h", "1.5 h", "45 min". */
export function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;

  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

/** Hours left on a normal playthrough at the game's current progress. */
export function hoursLeft(game: Pick<Game, "time_normal" | "progress">) {
  if (!game.time_normal) return null;

  return Math.round(game.time_normal * (1 - game.progress / 100) * 2) / 2;
}

export function howLongToBeatUrl(title: string) {
  return `https://howlongtobeat.com/?q=${encodeURIComponent(title)}`;
}
