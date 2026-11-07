import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from 'drizzle-orm/postgres-js';
import path from 'path';
import postgres from 'postgres';
import { SEED_USERS } from '@/lib/mock/connan';
import { seedDemoIncidentsIfEmpty } from './demo-seed';
import * as schema from './schema';

export type AppDatabase =
  | PostgresJsDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

const BOOTSTRAP_DDL = `
CREATE SEQUENCE IF NOT EXISTS "incident_id_seq" INCREMENT BY 1 MINVALUE 1 START WITH 1 CACHE 1;

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "site" text
);

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" text PRIMARY KEY NOT NULL,
  "cycle" integer DEFAULT 1 NOT NULL,
  "status" text NOT NULL,
  "current_owner_roles" text[] DEFAULT '{}' NOT NULL,
  "submitted_by" text NOT NULL,
  "supervisor_id" text NOT NULL,
  "answers" jsonb NOT NULL,
  "transcript" text,
  "ai" jsonb,
  "footage_hold_requested" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "closed_at" timestamp with time zone,
  "site" text DEFAULT 'Main Site' NOT NULL,
  "types" text[] DEFAULT '{}' NOT NULL,
  "severity" text DEFAULT 'Unsure' NOT NULL
);

CREATE TABLE IF NOT EXISTS "supervisor_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "incident_id" text NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "cycle" integer NOT NULL,
  "reviewer_id" text NOT NULL,
  "confirmed_types" text[] DEFAULT '{}' NOT NULL,
  "severity" text NOT NULL,
  "serious_behavioural" boolean DEFAULT false NOT NULL,
  "health_care_beyond_first_aid" boolean DEFAULT false NOT NULL,
  "lost_time" boolean DEFAULT false NOT NULL,
  "critical_injury" boolean DEFAULT false NOT NULL,
  "corrective_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "footage_hold" boolean DEFAULT false NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL,
  CONSTRAINT "supervisor_reviews_incident_cycle_unique" UNIQUE("incident_id","cycle")
);

CREATE TABLE IF NOT EXISTS "acknowledgements" (
  "id" text PRIMARY KEY NOT NULL,
  "incident_id" text NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "cycle" integer NOT NULL,
  "type" text NOT NULL,
  "role" text NOT NULL,
  "acked_by" text,
  "acked_at" timestamp with time zone,
  "comment" text,
  "to_confirm" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "follow_up_actions" (
  "id" text PRIMARY KEY NOT NULL,
  "incident_id" text NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "owner_role" text NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "status" text DEFAULT 'NOT_STARTED' NOT NULL,
  "completed_at" timestamp with time zone,
  "kind" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "compliance_clocks" (
  "id" text PRIMARY KEY NOT NULL,
  "incident_id" text NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "met_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "events" (
  "time" timestamp with time zone NOT NULL,
  "incident_id" text NOT NULL REFERENCES "incidents"("id") ON DELETE cascade,
  "cycle" integer NOT NULL,
  "actor_id" text NOT NULL,
  "kind" text NOT NULL,
  "from_status" text,
  "to_status" text,
  "payload" jsonb
);

CREATE INDEX IF NOT EXISTS "acknowledgements_incident_cycle_idx" ON "acknowledgements" ("incident_id","cycle");
CREATE INDEX IF NOT EXISTS "acknowledgements_role_idx" ON "acknowledgements" ("role");
CREATE INDEX IF NOT EXISTS "compliance_clocks_incident_idx" ON "compliance_clocks" ("incident_id");
CREATE INDEX IF NOT EXISTS "events_incident_time_idx" ON "events" ("incident_id","time");
CREATE INDEX IF NOT EXISTS "events_time_idx" ON "events" ("time");
CREATE INDEX IF NOT EXISTS "follow_up_actions_incident_idx" ON "follow_up_actions" ("incident_id");
CREATE INDEX IF NOT EXISTS "incidents_status_idx" ON "incidents" ("status");
CREATE INDEX IF NOT EXISTS "incidents_supervisor_idx" ON "incidents" ("supervisor_id");
CREATE INDEX IF NOT EXISTS "incidents_submitted_by_idx" ON "incidents" ("submitted_by");
CREATE INDEX IF NOT EXISTS "incidents_site_idx" ON "incidents" ("site");
CREATE INDEX IF NOT EXISTS "incidents_created_at_idx" ON "incidents" ("created_at");
`;

declare global {
  var __langsDbPromise: Promise<AppDatabase> | undefined;
  var __langsIsTimescale: boolean | undefined;
}

async function createPgliteDb(inMemory = false): Promise<AppDatabase> {
  const dataDir = inMemory
    ? undefined
    : process.env.VERCEL
      ? '/tmp/langs-pgdata'
      : path.join(process.cwd(), '.pgdata');
  const client = new PGlite(dataDir);
  await client.waitReady;
  await client.exec(BOOTSTRAP_DDL);
  const db = drizzlePglite(client, { schema });
  await seedBaseUsers(db);
  if (!inMemory && process.env.SKIP_DEMO_SEED !== 'true') {
    await seedDemoIncidentsIfEmpty(db);
  }
  return db;
}

async function initDatabase(): Promise<AppDatabase> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (isTest && !process.env.FORCE_EXTERNAL_DB) {
    return createPgliteDb(true);
  }

  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    try {
      const pgClient = postgres(dbUrl, {
        connect_timeout: 5,
        max: 10,
        prepare: false,
      });
      // Verify connection works
      await pgClient`SELECT 1`;
      const db = drizzlePostgres(pgClient, { schema });
      await pgClient.unsafe(BOOTSTRAP_DDL);

      // B4: On TigerData, make events a hypertable. Wrap in try so plain Postgres still works.
      try {
        await pgClient`SELECT create_hypertable('events', 'time', if_not_exists => TRUE)`;
        globalThis.__langsIsTimescale = true;
      } catch {
        globalThis.__langsIsTimescale = false;
      }

      await seedBaseUsers(db);
      if (process.env.SKIP_DEMO_SEED !== 'true') {
        await seedDemoIncidentsIfEmpty(db);
      }
      return db;
    } catch (err) {
      console.warn(
        '[db] Could not connect to DATABASE_URL; falling back to embedded PGlite Postgres:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  return createPgliteDb(false);
}

export async function seedBaseUsers(db: AppDatabase): Promise<void> {
  for (const user of SEED_USERS) {
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          name: user.name,
          role: user.role,
          site: user.site ?? null,
        },
      });
  }
}

export async function getDb(): Promise<AppDatabase> {
  if (!globalThis.__langsDbPromise) {
    globalThis.__langsDbPromise = initDatabase();
  }
  return globalThis.__langsDbPromise;
}

/**
 * Resets the database to a fresh in-memory PGlite instance (for unit/integration tests).
 */
export async function resetTestDb(): Promise<AppDatabase> {
  globalThis.__langsDbPromise = createPgliteDb(true);
  return globalThis.__langsDbPromise;
}

/**
 * Generates the next sequential incident ID in the format INC-2026-0001 (B4).
 */
export async function nextIncidentId(
  executor?: Pick<AppDatabase, 'execute'>,
): Promise<string> {
  const db = executor ?? (await getDb());
  const res = await db.execute(sql`SELECT nextval('incident_id_seq') AS seq_val`);
  const rows = Array.isArray(res)
    ? res
    : (res as unknown as { rows?: Record<string, unknown>[] }).rows ?? [];
  const rawVal = rows[0]?.seq_val ?? 1;
  const num = Number(rawVal) || 1;
  return `INC-2026-${String(num).padStart(4, '0')}`;
}

export { schema };
