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

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel and database setup.

## License

This project is derived from the Vercel v0 SDK example. See [LICENSE](./LICENSE)
for the upstream Apache-2.0 terms.
