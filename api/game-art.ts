import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { rawgUrl } from "./_lib/rawg.js";

const STEAM_ART = "https://shared.steamstatic.com/store_item_assets/steam/apps";

async function exists(url: string) {
  const response = await fetch(url, { method: "HEAD" });

  return response.ok;
}

/** Finds real box art for a game: its Steam library capsule (portrait) and hero image, when it is on Steam. */
export async function POST(request: Request) {
  if (!(await verifyCaller(request))) return unauthorized();

  const body = await readJson(request);
  const rawgId = Number(body.rawgId);
  if (!Number.isInteger(rawgId) || rawgId <= 0) return json({ box: null, hero: null });

  const url = rawgUrl(`games/${rawgId}/stores`);
  if (!url) return json({ box: null, hero: null });

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`RAWG stores lookup failed [${response.status}] for game ${rawgId}`);

    return json({ box: null, hero: null });
  }

  const data = (await response.json()) as { results: { url: string }[] };
  const steamUrl = data.results.map((r) => r.url).find((u) => u.includes("store.steampowered.com/app/"));
  const appId = steamUrl?.match(/\/app\/(\d+)/)?.[1];
  if (!appId) return json({ box: null, hero: null });

  const box = `${STEAM_ART}/${appId}/library_600x900.jpg`;
  const hero = `${STEAM_ART}/${appId}/library_hero.jpg`;
  const [hasBox, hasHero] = await Promise.all([exists(box), exists(hero)]);

  return json({ box: hasBox ? box : null, hero: hasHero ? hero : null });
}
