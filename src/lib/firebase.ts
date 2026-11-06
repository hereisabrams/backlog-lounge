import { initializeApp } from "firebase/app";
import { browserLocalPersistence, browserPopupRedirectResolver, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const env = import.meta.env;

if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) {
  throw new Error("The VITE_FIREBASE_* settings are missing (see .env)");
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
