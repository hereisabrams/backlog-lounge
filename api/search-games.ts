import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { IGDB_MISSING, igdb, isIgdbConfigured } from "./_lib/igdb.js";
import { apicalypseText, toSearchResult, type IgdbGame, type IgdbTimeToBeat } from "./_lib/igdbMap.js";

const GAME_FIELDS = "name,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,platforms.name";

export async function POST(request: Request) {
  if (!(await verifyCaller(request))) return unauthorized();

  const body = await readJson(request);
  const query = apicalypseText(String(body.query ?? "").slice(0, 100));
  if (query.length < 2) return json({ results: [] });
  if (!isIgdbConfigured()) return json({ results: [], error: IGDB_MISSING });

  try {
    const games = await igdb<IgdbGame[]>("games", `search "${query}"; fields ${GAME_FIELDS}; where version_parent = null; limit 8;`);
    const times = games.length
      ? await igdb<IgdbTimeToBeat[]>(
          "game_time_to_beats",
          `fields game_id,hastily,normally,completely; where game_id = (${games.map((g) => g.id).join(",")}); limit 8;`,
        )
      : [];

    return json({ results: games.map((game) => toSearchResult(game, times.find((t) => t.game_id === game.id))) });
  } catch (error) {
    console.error("IGDB search failed", error);

    return json({ results: [], error: "Game search failed. Try again in a moment." });
  }
}
