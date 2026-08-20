# Yappa

Bun monorepo with a Next.js web app, Hono API, and SQLite through Drizzle ORM.

## Run locally

```bash
bun install
cp .env.example .env
bun run dev
```

- Web: http://localhost:3000
- API: http://localhost:3101
- Health check: http://localhost:3101/health

Add your OpenAI and Fish Audio credentials to `.env` before generating a
podcast. Local database and audio files stay under `data/` and are not tracked.

Useful commands:

```bash
bun run check
bun run lint
bun run build
bun run db:generate
bun run podcast:generate -- "Should cities ban cars?"
```

Add tables in `packages/db/src/schema.ts`, then run `bun run db:generate` to create SQL migrations.

Override `WEB_PORT`, `API_PORT`, `WEB_ORIGIN`, and `NEXT_PUBLIC_API_URL` together
if the default ports are occupied.
