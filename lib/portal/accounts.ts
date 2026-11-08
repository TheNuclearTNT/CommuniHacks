import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SEED_USERS } from "@/lib/mock/connan";
import type { Role } from "@/lib/types";
import { rowsOf } from "./rows";

// Per-person logins for the supervisor / executive portal.
//
// DEMO-GRADE: every account starts with the password "123". Passwords are
// stored hashed (scrypt), and the session cookie is signed so it cannot be
// forged, but this is still a prototype gate, not production authentication.

export const SESSION_COOKIE = "portal_session";
export const ADMIN_ID = "admin";
const DEMO_PASSWORD = "123";

export interface PortalAccount {
  id: string;
  name: string;
  role: Role;
  // The app user this login acts as (drives the role cookies / queues).
  userId: string;
  isAdmin: boolean;
}

interface AccountRow {
  id: string;
  name: string;
  user_id: string;
  role: Role;
  is_admin: boolean;
  password_hash: string;
}

function toAccount(r: AccountRow): PortalAccount {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    userId: r.user_id,
    isAdmin: Boolean(r.is_admin),
  };
}

// --- password hashing ------------------------------------------------------

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// --- table + seed ----------------------------------------------------------

declare global {
  var __portalAccountsReady: Promise<void> | undefined;
}

async function init(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portal_accounts (
      id text PRIMARY KEY,
      name text NOT NULL,
      user_id text NOT NULL,
      role text NOT NULL,
      is_admin boolean NOT NULL DEFAULT false,
      password_hash text NOT NULL
    )`);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS portal_accounts_name_idx ON portal_accounts (lower(name))`,
  );

  const existing = rowsOf<{ id: string }>(
    await db.execute(sql`SELECT id FROM portal_accounts LIMIT 1`),
  );
  if (existing.length > 0) return;

  // ADMIN acts as the executive user so the role queues still work for it.
  const seeds = [
    { id: ADMIN_ID, name: "ADMIN", role: "EXECUTIVE", userId: "u_exec", admin: true },
    ...SEED_USERS.filter((u) => u.role !== "STAFF").map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      userId: u.id,
      admin: false,
    })),
  ];
  for (const s of seeds) {
    await db.execute(sql`
      INSERT INTO portal_accounts (id, name, user_id, role, is_admin, password_hash)
      VALUES (${s.id}, ${s.name}, ${s.userId}, ${s.role}, ${s.admin}, ${hashPassword(DEMO_PASSWORD)})
      ON CONFLICT DO NOTHING`);
  }
}

export function ensureAccounts(): Promise<void> {
  if (!globalThis.__portalAccountsReady) {
    globalThis.__portalAccountsReady = init().catch((err) => {
      globalThis.__portalAccountsReady = undefined; // retry next request
      throw err;
    });
  }
  return globalThis.__portalAccountsReady;
}

// --- queries ---------------------------------------------------------------

export async function listAccounts(): Promise<PortalAccount[]> {
  await ensureAccounts();
  const db = await getDb();
  const rows = rowsOf<AccountRow>(
    await db.execute(
      sql`SELECT * FROM portal_accounts ORDER BY is_admin DESC, role, name`,
    ),
  );
  return rows.map(toAccount);
}

export async function getAccountById(id: string): Promise<PortalAccount | null> {
  await ensureAccounts();
  const db = await getDb();
  const rows = rowsOf<AccountRow>(
    await db.execute(sql`SELECT * FROM portal_accounts WHERE id = ${id} LIMIT 1`),
  );
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function verifyLogin(
  name: string,
  password: string,
): Promise<PortalAccount | null> {
  await ensureAccounts();
  const db = await getDb();
  const rows = rowsOf<AccountRow>(
    await db.execute(
      sql`SELECT * FROM portal_accounts WHERE lower(name) = lower(${name}) LIMIT 1`,
    ),
  );
  const row = rows[0];
  if (!row || !checkPassword(password, row.password_hash)) return null;
  return toAccount(row);
}

export class AccountError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function updateAccount(
  id: string,
  changes: { name?: string; password?: string },
): Promise<void> {
  const current = await getAccountById(id);
  if (!current) throw new AccountError("Account not found", 404);
  const db = await getDb();

  if (changes.name !== undefined && changes.name !== current.name) {
    if (current.isAdmin) {
      throw new AccountError("The ADMIN account name cannot be changed", 400);
    }
    const clash = rowsOf<{ id: string }>(
      await db.execute(
        sql`SELECT id FROM portal_accounts WHERE lower(name) = lower(${changes.name}) AND id <> ${id} LIMIT 1`,
      ),
    );
    if (clash.length > 0) {
      throw new AccountError("Another account already uses that name", 409);
    }
    await db.execute(
      sql`UPDATE portal_accounts SET name = ${changes.name} WHERE id = ${id}`,
    );
  }

  if (changes.password !== undefined) {
    await db.execute(
      sql`UPDATE portal_accounts SET password_hash = ${hashPassword(changes.password)} WHERE id = ${id}`,
    );
  }
}

// --- signed session cookie -------------------------------------------------

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

export function makeSessionValue(id: string): string {
  return `${id}.${sign(id)}`;
}

function readSessionValue(value: string | undefined): string | null {
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

/** The signed-in account for this request, or null. Always re-read from the DB. */
export async function getSession(): Promise<PortalAccount | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = readSessionValue(value);
  if (!id) return null;
  return getAccountById(id);
}
