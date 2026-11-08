import { createHmac, timingSafeEqual } from "node:crypto";

// The signed session cookie for the supervisor / executive login.
//
// This file depends on nothing but node:crypto, so both the database-backed
// guards (lib/portal/accounts.ts) and proxy.ts can use it. It only proves the
// cookie was issued by this server; whether the account still exists is
// checked against the database by the page and API guards.

export const SESSION_COOKIE = "portal_session";

function secret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "langs-demo-secret"
  );
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

/** The cookie value for an account id: `<id>.<signature>`. */
export function makeSessionValue(id: string): string {
  return `${id}.${sign(id)}`;
}

/** The account id inside a genuine cookie value, or null if missing or forged. */
export function readSessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  return id;
}
