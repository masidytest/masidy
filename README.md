# Masidy

Masidy is a white-labeled AI app builder for creating, previewing, and
customizing web applications. It uses the v0 Platform API for AI generation.

This standalone app is based on the Vercel v0 SDK example and retains the
upstream Apache-2.0 license in [LICENSE](./LICENSE).

## Features

- AI-generated applications with streaming chat and live previews
- Authentication, chat history, projects, and workspace navigation
- MIT-licensed open-source project starters
- Design systems, project secrets, and deployment management
- Direct production deployments to the configured Masidy Vercel team
- Project-scoped Vercel Marketplace resources
- Local SQLite development or a remote Turso database

## Getting started

Requirements: Node.js 22 or newer and pnpm 9 or newer.

```bash
pnpm install
```

Create `.env.local` with at least:

```dotenv
AUTH_SECRET=replace-with-a-random-secret
V0_API_KEY0=your-v0-api-key
```

Get a v0 API key from [v0 API key settings](https://v0.app/chat/settings/keys).
Generate an auth secret with `openssl rand -base64 32`. Keep environment files
private; never commit API keys or secrets.

```bash
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel deployments and Marketplace resources

Set `VERCEL_TOKEN_KEY` to a Vercel API token for the Masidy team and
`VERCEL_TEAM_ID` to that team's ID. Marketplace products must already be
installed for the team. Project owners can provision products with a verified
zero-cost plan from the project workspace; paid plans are not offered. The
resource is provisioned and connected to a Vercel project owned by the Masidy
team. Owners can disconnect and reconnect it; disconnecting unlinks the
resource from the project but does not delete or cancel the provider resource.

Project owners can deploy completed generated versions to production projects
owned by the configured Masidy Vercel team. Deployments use the completed
version archive fetched server-side; environment files and local build folders
are excluded. This shared-team flow does not deploy into a user's personal
Vercel account. GitHub export remains a ZIP download; direct GitHub repository
connections need a separately configured GitHub App or OAuth integration.

Marketplace setup metadata is validated on the server against the installed
product schema. Marketplace integration records are stored in their own table. Existing
Supabase connection records are retained in a legacy table and are no longer
used by the Marketplace UI.

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel and database setup.

## License

This project is derived from the Vercel v0 SDK example. See [LICENSE](./LICENSE)
for the upstream Apache-2.0 terms.
