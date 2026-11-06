import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export function firebaseProjectId() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");

  return projectId;
}

export type Caller = { uid: string; idToken: string };

/** Verifies the Firebase ID token in the Authorization header. Returns null when it is missing or invalid. */
export async function verifyCaller(request: Request): Promise<Caller | null> {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!idToken) return null;

  try {
    const projectId = firebaseProjectId();
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    return { uid: payload.sub, idToken };
  } catch (error) {
    console.warn("Rejected an API call with an invalid Firebase token", (error as Error).message);

    return null;
  }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const unauthorized = () => json({ error: "Sign in first." }, 401);

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();

    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
