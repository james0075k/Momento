# Running Momento on your computer

## The quick way (no database account needed)

```bash
pnpm install
pnpm dev:local
```

That starts the website at <http://localhost:3000> and the API at <http://localhost:4000>. The API brings its own
local database (kept in `apps/api/.mongo-data`, so your products, orders and settings survive a restart), adds the sample
shop and a first admin the first time, and then serves them. The first run downloads MongoDB once.

Sign-in details for the API (there is no admin screen yet): the email and password come from `FIRST_ADMIN_EMAIL` and
`FIRST_ADMIN_PASSWORD` in `.env` (defaults `admin@momento.test` / `Admin-Pass-2026!`).

To start clean, stop it and delete `apps/api/.mongo-data`.

## With your own MongoDB (Atlas)

1. Copy `.env.example` to `.env` at the repo root (it is git-ignored). The API only reads `.env`, never `.env.example`.
2. Fill `MONGODB_URI` (and allow your IP in Atlas, Network Access), `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
   (two different random values of 32 or more characters), and the `FIRST_ADMIN_*` values.
3. `pnpm --filter @momento/api seed` once, then `pnpm dev`.

Lines left blank in `.env` count as "not set".

## Commands

| Command                                  | What it does                                                  |
| ---------------------------------------- | ------------------------------------------------------------- |
| `pnpm dev:local`                         | Website + API + local database (above)                        |
| `pnpm dev`                               | Website + API, using the database in `.env`                   |
| `pnpm --filter @momento/web dev:webpack` | Website with the older compiler, if Turbopack ever misbehaves |

## If the website shows an empty shop or "taking a short break"

The website is running but the API is not. Start the API (`pnpm dev:local`), then reload. While the API is down, product
and service pages say so instead of showing "not found", and nothing is cached from that moment.

The first visit to each page in development is slow while it compiles; later visits are fast. Turbopack (used by
`pnpm dev`) makes that first visit several times quicker than before.
