import { queryOptions } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, type DocumentData } from "firebase/firestore";
import { currentUser } from "./auth";
import { db } from "./firebase";
import { isGameStatus, type Game, type GameFields, type GameStatus } from "./games";

// Firestore layout (rules in firestore.rules): users/{uid}/games/{gameId}, readable and writable by that user only.
async function gamesCollection() {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");

  return collection(db, "users", user.uid, "games");
}

const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const stringOrNull = (value: unknown) => (typeof value === "string" && value ? value : null);

function docToGame(id: string, data: DocumentData): Game {
  return {
    id,
    title: String(data.title ?? "Untitled"),
    platform: String(data.platform ?? "PC"),
    status: isGameStatus(data.status) ? data.status : "backlog",
    score: numberOrNull(data.score),
    progress: numberOrNull(data.progress) ?? 0,
    price: numberOrNull(data.price),
    store: stringOrNull(data.store),
    cover_url: stringOrNull(data.cover_url),
    hero_url: stringOrNull(data.hero_url),
    rawg_id: numberOrNull(data.rawg_id),
    notes: stringOrNull(data.notes),
    created_at: numberOrNull(data.created_at) ?? 0,
    updated_at: numberOrNull(data.updated_at) ?? 0,
  };
}

export const gamesQuery = queryOptions({
  queryKey: ["games"],
  queryFn: async () => {
    const snapshot = await getDocs(query(await gamesCollection(), orderBy("updated_at", "desc")));

    return snapshot.docs.map((d) => docToGame(d.id, d.data()));
  },
});

export async function createGame(fields: GameFields) {
  const now = Date.now();
  await addDoc(await gamesCollection(), { ...fields, created_at: now, updated_at: now });
}

export async function updateGame(id: string, fields: Partial<GameFields>) {
  await updateDoc(doc(await gamesCollection(), id), { ...fields, updated_at: Date.now() });
}

export async function moveGame(id: string, status: GameStatus) {
  await updateGame(id, { status });
}

export async function deleteGame(id: string) {
  await deleteDoc(doc(await gamesCollection(), id));
}
