import { groupByConsole, type Game, type GameStatus } from "./games";

const STEAM_ART = "https://shared.steamstatic.com/store_item_assets/steam/apps";

const demo = (title: string, platform: string, status: GameStatus, progress: number, steamAppId?: number, price?: number): Game => ({
  id: `demo-${title}`,
  title,
  platform,
  status,
  progress,
  score: status === "done" ? 9 : null,
  price: price ?? null,
  store: null,
  cover_url: steamAppId ? `${STEAM_ART}/${steamAppId}/library_600x900.jpg` : null,
  hero_url: steamAppId ? `${STEAM_ART}/${steamAppId}/library_hero.jpg` : null,
  rawg_id: null,
  notes: null,
  created_at: 0,
  updated_at: progress,
});

/** The example room on the landing page, with real box art. */
export const DEMO_GAMES: Game[] = [
  demo("Elden Ring", "PS5", "playing", 72, 1245620, 59.99),
  demo("God of War Ragnarök", "PS5", "done", 100, 2322010, 69.99),
  demo("Death Stranding", "PS5", "backlog", 0, 1850570, 39.99),
  demo("Marvel's Spider-Man", "PS5", "backlog", 0, 1817070, 29.99),
  demo("Shadow of the Colossus", "PS2", "done", 100, undefined, 12),
  demo("Hollow Knight", "Switch", "playing", 41, 367520, 14.99),
  demo("Celeste", "Switch", "done", 100, 504230, 19.99),
  demo("Stardew Valley", "Switch", "backlog", 0, 413150, 14.99),
  demo("Cyberpunk 2077", "Xbox Series X|S", "backlog", 0, 1091500, 29.99),
  demo("Red Dead Redemption 2", "Xbox Series X|S", "stopped", 35, 1174180, 24.99),
  demo("Hades II", "PC", "playing", 18, 1145350, 29.99),
  demo("Balatro", "PC", "done", 100, 2379780, 14.99),
  demo("Hades", "PC", "backlog", 0, 1145360, 24.99),
  demo("Metroid Prime", "GameCube", "backlog", 0, undefined, 20),
];

export const DEMO_CONSOLES = groupByConsole(DEMO_GAMES);
