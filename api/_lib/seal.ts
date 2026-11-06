import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function sealKey() {
  const raw = process.env.HLTB_SEAL_KEY;
  if (!raw) throw new Error("HLTB_SEAL_KEY is not set");

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("HLTB_SEAL_KEY must be 32 bytes, base64 encoded");

  return key;
}

export const isSealConfigured = () => Boolean(process.env.HLTB_SEAL_KEY);

/**
 * Encrypts a secret (the HowLongToBeat session) so it can be stored on the user's account but only read
 * by these server functions. The Firebase uid is bound in as associated data, so a sealed value copied to
 * another account won't open.
 */
export function seal(secret: string, uid: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  cipher.setAAD(Buffer.from(uid));
  const body = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);

  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** Returns null when the value was tampered with, sealed for another account, or with another key. */
export function unseal(sealed: string, uid: string): string | null {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !body) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(uid));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));

    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
