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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

/** Calls one of our /api functions as the signed-in user. Failures carry the function's own message. */
export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");

  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as { error?: string; code?: string };

    throw new ApiError(failure.error ?? `Request failed (${response.status})`, response.status, failure.code ?? null);
  }

  return (await response.json()) as T;
}
