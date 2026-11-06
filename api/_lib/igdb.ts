export const IGDB_MISSING = "Game search isn't set up yet — add the IGDB (Twitch) keys.";

type Token = { value: string; expiresAt: number };

let cachedToken: Token | null = null;

function credentials() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const isIgdbConfigured = () => credentials() !== null;

async function accessToken(clientId: string, clientSecret: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const query = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${query}`, { method: "POST" });
  if (!response.ok) throw new Error(`Twitch token request failed [${response.status}]`);

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };

  return cachedToken.value;
}

/** Runs an Apicalypse query against an IGDB endpoint, e.g. igdb("games", "search \"zelda\"; fields name;"). */
export async function igdb<T>(endpoint: string, body: string): Promise<T> {
  const keys = credentials();
  if (!keys) throw new Error(IGDB_MISSING);

  const send = async () =>
    fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": keys.clientId,
        Authorization: `Bearer ${await accessToken(keys.clientId, keys.clientSecret)}`,
        "Content-Type": "text/plain",
      },
      body,
    });

  let response = await send();
  if (response.status === 401) {
    cachedToken = null;
    response = await send();
  }
  if (!response.ok) throw new Error(`IGDB ${endpoint} failed [${response.status}]: ${(await response.text()).slice(0, 300)}`);

  return (await response.json()) as T;
}
