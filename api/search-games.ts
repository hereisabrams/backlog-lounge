import { json, readJson, unauthorized, verifyCaller } from "./_lib/auth.js";
import { RAWG_MISSING, rawgUrl } from "./_lib/rawg.js";

type RawgGame = {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  platforms: { platform: { name: string } }[] | null;
};

export async function POST(request: Request) {
  if (!(await verifyCaller(request))) return unauthorized();

  const body = await readJson(request);
  const query = String(body.query ?? "").trim().slice(0, 100);
  if (query.length < 2) return json({ results: [] });

  const url = rawgUrl("games", { search: query, page_size: "8", search_precise: "true" });
  if (!url) return json({ results: [], error: RAWG_MISSING });

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`RAWG search failed [${response.status}]`, (await response.text()).slice(0, 500));

    return json({ results: [], error: `Game search failed (${response.status}).` });
  }

  const data = (await response.json()) as { results: RawgGame[] };

  return json({
    results: data.results.map((r) => ({
      id: r.id,
      name: r.name,
      released: r.released,
      cover: r.background_image,
      platforms: (r.platforms ?? []).map((p) => p.platform.name),
    })),
  });
}
