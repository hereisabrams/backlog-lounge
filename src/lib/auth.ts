import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth } from "./firebase";

export async function currentUser(): Promise<User | null> {
  await auth.authStateReady();

  return auth.currentUser;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await firebaseSignOut(auth);
}

/** Calls one of our /api functions as the signed-in user. */
export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");

  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);

  return (await response.json()) as T;
}
