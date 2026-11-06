import { generateText } from "ai";
import { firebaseProjectId, json, readJson, unauthorized, verifyCaller, type Caller } from "./_lib/auth.js";

const MODEL = "anthropic/claude-haiku-5.5";

const INSTRUCTIONS =
  'You recommend one game from the player\'s backlog. Consider typical session length, how long the game takes to beat when given, genre and the player\'s mood. Only pick from the list. Reply with ONLY JSON: {"id":"<id>","reason":"<2 short friendly sentences, mention why it fits the time and mood>"}';

type BacklogGame = {
  id: string;
  title: string;
  platform: string;
  status: string;
  progress: number;
  notes: string;
  hoursToBeat: number | null;
};

type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number };

/** Reads the caller's backlog through Firestore's REST API with their own token, so the security rules apply. */
async function readBacklog(caller: Caller): Promise<BacklogGame[]> {
  const base = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents/users/${caller.uid}`;
  const response = await fetch(`${base}:runQuery`, {
    method: "POST",
    headers: { authorization: `Bearer ${caller.idToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "games" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "IN",
            value: { arrayValue: { values: [{ stringValue: "backlog" }, { stringValue: "stopped" }] } },
          },
        },
        select: { fields: ["title", "platform", "status", "progress", "notes", "time_normal"].map((fieldPath) => ({ fieldPath })) },
        limit: 200,
      },
    }),
  });
  if (!response.ok) throw new Error(`Firestore query failed [${response.status}]: ${(await response.text()).slice(0, 300)}`);

  const rows = (await response.json()) as { document?: { name: string; fields?: Record<string, FirestoreValue> } }[];

  return rows.flatMap(({ document }) => {
    if (!document) return [];

    const f = document.fields ?? {};
    const progress = Number(f.progress?.integerValue ?? f.progress?.doubleValue ?? 0);
    const hoursToBeat = Number(f.time_normal?.integerValue ?? f.time_normal?.doubleValue ?? Number.NaN);

    return [
      {
        id: document.name.split("/").pop() ?? "",
        title: f.title?.stringValue ?? "Untitled",
        platform: f.platform?.stringValue ?? "",
        status: f.status?.stringValue ?? "backlog",
        progress: Number.isFinite(progress) ? progress : 0,
        notes: f.notes?.stringValue ?? "",
        hoursToBeat: Number.isFinite(hoursToBeat) ? hoursToBeat : null,
      },
    ];
  });
}

function describe(games: BacklogGame[]) {
  return games
    .map((g) => {
      const length = g.hoursToBeat ? ` | ~${g.hoursToBeat}h to beat` : "";
      const notes = g.notes ? ` | notes: ${g.notes.slice(0, 120)}` : "";

      return `- id=${g.id} | ${g.title} | ${g.platform} | ${g.status} | ${g.progress}%${length}${notes}`;
    })
    .join("\n");
}

function friendlyError(error: unknown) {
  const status = (error as { statusCode?: number }).statusCode;
  if (status === 403 && String((error as Error).message).includes("credit card")) {
    return "AI picks aren't switched on yet — add a card in Vercel's AI Gateway settings to unlock the free credits.";
  }
  if (status === 402) return "The AI is out of credits — top up AI Gateway credits in Vercel.";
  if (status === 429) return "Too many requests — try again in a minute.";

  return "The recommender couldn't answer right now.";
}

export async function POST(request: Request) {
  const caller = await verifyCaller(request);
  if (!caller) return unauthorized();

  const body = await readJson(request);
  const minutes = Math.max(5, Math.min(1440, Math.round(Number(body.minutes) || 60)));
  const mood = String(body.mood ?? "").trim().slice(0, 500);

  let games: BacklogGame[];
  try {
    games = await readBacklog(caller);
  } catch (error) {
    console.error("Reading the backlog for a recommendation failed", error);

    return json({ error: "Couldn't read your backlog." });
  }
  if (!games.length) return json({ error: "Your backlog is empty — add a game first." });

  try {
    const { text } = await generateText({
      model: MODEL,
      system: INSTRUCTIONS,
      prompt: `I have ${minutes} minutes. I feel like: ${mood || "anything"}\n\nBacklog:\n${describe(games)}`,
      maxRetries: 1,
    });
    const answer = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { id?: string; reason?: string };
    const game = games.find((g) => g.id === answer.id) ?? games[0]!;

    return json({ pick: { gameId: game.id, title: game.title, reason: String(answer.reason ?? "") } });
  } catch (error) {
    console.error("Recommendation failed", error);

    return json({ error: friendlyError(error) });
  }
}
