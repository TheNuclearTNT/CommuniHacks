# Deployment (paste into the README's "Deploy" section)

Hosting is **Vercel**. No Dockerfile or server config needed.

## One-time setup

1. In Vercel: **Add New → Project → Import** the GitHub repo. Framework preset: Next.js. Leave build settings at defaults.
2. **Settings → Environment Variables** (Production and Preview):
   `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `ELEVENLABS_API_KEY`, `USE_MOCK_AI`.
   Never commit these. Set `USE_MOCK_AI=true` on Preview if you want previews to cost nothing.
3. Deploy. Every push to `main` deploys to production; every pull request gets a preview link.
4. Until the domain is connected, use the free `https://<project>.vercel.app` URL.

## Domain (GoDaddy)

1. Vercel → Project → **Settings → Domains → Add** the domain (and `www.` if wanted).
2. Vercel shows the DNS records to create (usually an `A` record for the root and a `CNAME` for `www`). Add exactly those in GoDaddy → **DNS → Manage DNS**, removing any conflicting `A`/`CNAME` records.
3. Wait for Vercel to show "Valid configuration". HTTPS is issued automatically.

## Database + seed data

The deployed app and your laptop share TigerData through the same `DATABASE_URL`. Connan's `getDb()` creates the tables and users on first connect.

```bash
# on a laptop, with .env.local pointing at the TigerData DATABASE_URL
npm run seed      # or: npx tsx --env-file-if-exists=.env.local scripts/seed.ts
```

The seed writes directly to the database through Connan's workflow engine, so it doesn't need a running server. The Vercel site shows the same records as soon as it finishes. Re-running it wipes and reseeds incidents; users are kept.

## Function limits

Gemini and ElevenLabs calls should finish well under Vercel's default timeout. If a route is slow (transcribe, AI analysis on submit), the route owner adds `export const maxDuration = 30` to that route file.

## Local fallback for the demo

Keep one laptop ready that needs no internet:

1. No `DATABASE_URL` in `.env.local`: the app falls back to the embedded PGlite database in `.pgdata`, so no Postgres install is needed.
2. `.env.local` with `USE_MOCK_AI=true` (no Gemini or ElevenLabs needed; voice falls back to typing).
3. `npm run seed` **with the dev server stopped** (only one process can open `.pgdata`), then `npm run dev`.
4. Test the full demo script on it once, offline (Wi-Fi off).
