import { queryOptions, useQuery } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext } from "react";
import { currentUser } from "./auth";
import { db } from "./firebase";
import { DEFAULT_CURRENCY, formatMoney, isCurrency, type Currency } from "./games";

export type Settings = { currency: Currency };

// Firestore layout (rules in firestore.rules): users/{uid} holds the account's settings.
async function settingsDoc() {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");

  return doc(db, "users", user.uid);
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    const snapshot = await getDoc(await settingsDoc());
    const currency = snapshot.data()?.currency;

    return { currency: isCurrency(currency) ? currency : DEFAULT_CURRENCY };
  },
});

export async function saveSettings(settings: Settings) {
  await setDoc(await settingsDoc(), { ...settings, updated_at: Date.now() });
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
