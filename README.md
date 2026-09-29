# CRM-XX

CRM-XX is the internal CRM shared by Statixx and Trazo. It's one app with two
workspaces, so leads, deals, and clients for each business stay in one place
without mixing data between them.

## Status

Early foundation work. The app runs on Cloudflare Workers (via
[vinext](https://vinext.dev)) with a Cloudflare D1 database.

## Prerequisites

- Node.js 24 LTS (see `.nvmrc`)
- pnpm
- Git

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. `src/env.ts`
validates them with Zod at startup and throws a clear error if a required
variable is missing or malformed.

## Local development

```
pnpm install
pnpm db:migrate   # apply migrations to local D1
pnpm db:seed      # load demo data for Statixx and Trazo
pnpm dev          # http://localhost:3000
```

`pnpm build` produces the Workers build; `pnpm start` runs it locally with
Wrangler. Schema changes go in `src/server/db/schema.ts`; run
`pnpm db:generate` to create a migration, review the SQL, then
`pnpm db:migrate`. All local commands run against local D1 only.

## Contributing

- Changes land on `main` only through pull requests.
- Write commit messages as [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, and so on).
- Open a PR using the provided template, and keep each PR focused on one change.

## Morning digest

`workers/alerts/` is a small second Worker that emails each owner their overdue follow-ups, overdue waiting-on-reply emails, and today's meetings (weekdays, 13:00 UTC). People with nothing due get nothing. `/digest` in the app previews what would be sent.

Try it locally (after `pnpm db:migrate` and `pnpm db:seed`):

```bash
pnpm alerts:dev
curl "http://localhost:8799/__scheduled?cron=0+13+*+*+1-5"
```

The message is written to `workers/alerts/.wrangler/tmp/email/` and its path is logged. Live sending needs Email Routing enabled on the domain, each recipient verified there, and `FROM_ADDRESS` and `APP_URL` in `workers/alerts/wrangler.jsonc` set to real values.
