export const RAWG_MISSING = "Game search isn't set up yet — add your RAWG key.";

export function rawgUrl(path: string, params: Record<string, string> = {}) {
  const key = process.env.RAWG_API_KEY;
  if (!key) return null;

  const query = new URLSearchParams({ key, ...params });

  return `https://api.rawg.io/api/${path}?${query}`;
}
