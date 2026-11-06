import { queryOptions, useQuery } from "@tanstack/react-query";
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { createContext, useContext } from "react";
import { currentUser } from "./auth";
import { db } from "./firebase";
import { DEFAULT_CURRENCY, formatMoney, isCurrency, type Currency } from "./games";

/** A HowLongToBeat session sealed by the server; the app can store it but not read it. */
export type HltbConnection = { sealed: string; userId: number; userName: string | null; connectedAt: number };

export type Settings = { currency: Currency; hltb: HltbConnection | null };

function readHltb(value: unknown): HltbConnection | null {
  const hltb = value as Partial<HltbConnection> | undefined;
  if (!hltb || typeof hltb.sealed !== "string" || typeof hltb.userId !== "number") return null;

  return { sealed: hltb.sealed, userId: hltb.userId, userName: hltb.userName ?? null, connectedAt: Number(hltb.connectedAt ?? 0) };
}

// Firestore layout (rules in firestore.rules): users/{uid} holds the account's settings.
async function settingsDoc() {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");

  return doc(db, "users", user.uid);
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    const data = (await getDoc(await settingsDoc())).data();
    const currency = data?.currency;

    return { currency: isCurrency(currency) ? currency : DEFAULT_CURRENCY, hltb: readHltb(data?.hltb) };
  },
});

export async function saveCurrency(currency: Currency) {
  await setDoc(await settingsDoc(), { currency, updated_at: Date.now() }, { merge: true });
}

export async function saveHltbConnection(hltb: HltbConnection) {
  await setDoc(await settingsDoc(), { hltb, updated_at: Date.now() }, { merge: true });
}

export async function clearHltbConnection() {
  await updateDoc(await settingsDoc(), { hltb: deleteField(), updated_at: Date.now() });
}

export function useAccountSettings() {
  return useQuery(settingsQuery);
}

export const CurrencyContext = createContext<Currency>(DEFAULT_CURRENCY);

/** Formats an amount in the signed-in account's currency (dollars outside the app, e.g. the landing demo). */
export function useMoney() {
  const currency = useContext(CurrencyContext);

  return (amount: number) => formatMoney(amount, currency);
}
