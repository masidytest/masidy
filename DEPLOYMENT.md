# Masidy — Deployment Guide

## Overview

Masidy uses a dual-mode database strategy:

- **Local development** — falls back to a local SQLite file (`v0-clone.db`) automatically when no Turso env vars are set. Zero setup required.
- **Production (Vercel)** — uses [Turso](https://turso.tech) (libSQL remote SQLite) for a persistent, globally replicated database.

---

## Local Development Setup

1. **Clone the repo and install dependencies**

   ```bash
   git clone https://github.com/masidytest/masidy.git
   cd masidy
   pnpm install
   ```

2. **Create your `.env` file** (copy from the example if present, or create manually):

   ```bash
   cp .env.example .env   # or create .env manually
   ```

   Minimum required variables:

   ```env
   V0_API_KEY0=v1:team_...       # Or configure V0_API_KEYS with authorized keys
   AUTH_SECRET=some-random-secret  # NextAuth secret (run: openssl rand -base64 32)
   VERCEL_TOKEN_KEY=your-vercel-token # Required for Vercel project domains
   VERCEL_TEAM_ID=team_...          # Team ID for the Vercel project owner
   ```

   Leave `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` unset — the app will automatically use a local SQLite file.
   For branded project URLs, add `masidy.app` to the Vercel team, configure wildcard DNS for `*.masidy.app`, and set both Vercel variables above. Publishing a completed project then assigns a verified `<project-name>.masidy.app` domain where available.

3. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

4. **Start the dev server**

   ```bash
   pnpm dev
   # App runs on http://localhost:3001
   ```

---

## Production Deployment on Vercel

### Step 1 — Create a Turso Database

Install the Turso CLI and log in:

```bash
brew install tursodatabase/tap/turso   # macOS / Linux
turso auth login
```

Create the database:

```bash
turso db create masidy
```

Get the database URL:

```bash
turso db show masidy --url
# → libsql://masidy-<your-org>.turso.io
```

Generate an auth token:

```bash
turso db tokens create masidy
# → <token string>
```

### Step 2 — Set Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables** and add:

| Name                 | Value                                 | Environment |
| -------------------- | ------------------------------------- | ----------- |
| `TURSO_DATABASE_URL` | `libsql://masidy-<your-org>.turso.io` | Production  |
| `TURSO_AUTH_TOKEN`   | `<token from step above>`             | Production  |
| `V0_API_KEYS`        | `v1:team_...,v1:team_...`             | All         |
| `AUTH_SECRET`        | `<random secret>`                     | All         |

Set either `V0_API_KEYS` (comma-separated, optional `*N` weights) or
`V0_API_KEY0`, `V0_API_KEY1`, and/or `V0_API_KEY`. When a key receives `429`,
the pool cools it down and retries with another configured key. Only use API
keys you are authorized to use.

Generate a secure `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### Step 3 — Connect GitHub Repository

1. Push your code to GitHub (or your preferred Git provider).
2. In the Vercel dashboard, click **Add New Project** → **Import Git Repository**.
3. Select your repository.
4. Vercel auto-detects the `vercel.json` config — no extra framework settings needed.

### Step 4 — Deploy

Click **Deploy**. Vercel will:

1. Run `pnpm install`
2. Run `pnpm build` (which runs `tsx lib/db/migrate && next build --turbopack`)
3. The migration step will connect to Turso and apply all pending migrations automatically.

### Step 5 — Verify

- Open your Vercel deployment URL.
- Log in and create a chat to confirm the database is working.
- Check the Vercel deployment logs for any migration errors.

---

## Environment Variables Reference

| Variable                                                      | Required in Dev | Required in Prod | Description                                                                 |
| ------------------------------------------------------------- | --------------- | ---------------- | --------------------------------------------------------------------------- |
| `V0_API_KEYS` or `V0_API_KEY0` / `V0_API_KEY1` / `V0_API_KEY` | ✅ Yes          | ✅ Yes           | Authorized v0 API keys; `V0_API_KEYS` accepts comma-separated weighted keys |
| `AUTH_SECRET`                                                 | ✅ Yes          | ✅ Yes           | NextAuth.js secret for signing session tokens                               |
| `TURSO_DATABASE_URL`                                          | ❌ No           | ✅ Yes           | libSQL URL for the Turso remote database                                    |
| `TURSO_AUTH_TOKEN`                                            | ❌ No           | ✅ Yes (implied) | Auth token for Turso database access                                        |
| `VERCEL_TOKEN_KEY`                                            | ❌ No           | ❌ No            | Vercel API token for managing project domains                                |
| `VERCEL_TEAM_ID`                                              | ❌ No           | ❌ No            | Vercel team ID; required with the token for project-domain operations         |

---

## Updating the Database Schema

If you modify `lib/db/schema.ts`:

1. Generate a new migration:

   ```bash
   pnpm db:generate
   ```

2. Apply it locally:

   ```bash
   pnpm db:migrate
   ```

3. Commit the new migration file in `lib/db/migrations/` — it will be applied automatically on the next Vercel deployment.
