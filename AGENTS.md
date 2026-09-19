# CRM-XX: agent instructions

CRM-XX is the internal CRM shared by two businesses: **Statixx** (consulting, project-based deals) and **Trazo** (subscription software, recurring revenue). It is one app with two workspaces, and data must never leak between them.

- Planning source of truth: "CRM-XX — MVP Goals Doc" in Notion (https://app.notion.com/p/3e0e61a47e758136af4dfefdbaa062d5). Read it if you have Notion access; don't edit it.
- Current iteration plan and checklist: `docs/plan/iteration-1.md`. Tick its boxes as you finish items.
- Owner and reviewer: Isaac. See "Ask first" below.

## Stack (accepted; don't swap parts without asking)

- Next.js (latest stable, App Router), TypeScript in strict mode, pnpm
- PostgreSQL on Neon; Drizzle ORM with drizzle-kit migrations; `pg` (node-postgres) driver
- Better Auth: Google sign-in only, organization plugin (organizations are our workspaces)
- Tailwind + shadcn/ui; TanStack Table for lists; dnd-kit for the Kanban (iteration 2); React Hook Form
- Zod at every boundary: env vars, forms, server action inputs
- Vitest for unit and service tests against real Postgres; Playwright for E2E (later iteration)
- Deploy target is chosen at launch on price: Cloudflare Workers (via OpenNext) or Vercel. The code must run on both.

## Architecture rules

1. **Workspace isolation.** Every business table has `workspace_id` referencing Better Auth's `organization.id`. All data access goes through `src/server/services/`. Every service function takes `ctx: WorkspaceCtx` as its first argument and scopes every query to `ctx.workspaceId`. Pages, route handlers, and server actions never query the database directly.
2. **One way to get a context.** `requireWorkspace(slug)` in `src/server/auth/` loads the session, checks membership for that workspace slug, and returns `{ db, workspaceId, workspaceSlug, userId, role }`. Layouts, pages, and server actions call it first. Only test helpers build a ctx any other way.
3. **Request-scoped database clients.** Never create a DB client or pool at module scope. `getDb()` builds a Drizzle client over a new `pg` Pool with `maxUses: 1`, wrapped in React's `cache()`; this is the pattern OpenNext requires on Cloudflare Workers. Read the connection string through a single `getDatabaseUrl()` so it can switch to a Hyperdrive binding at deploy. Build Better Auth the same way, with a `getAuth()` factory that uses `getDb()`.
4. **Authorization lives in server code.** Check session and role in layouts, server actions, and services. An edge redirect (middleware or proxy, whichever file your Next.js version uses) may check for a session cookie as a UX nicety, but it is never the security boundary.
5. **Host-neutral runtime code.** No Node-only APIs in request paths (`fs`, `child_process`, and similar), no Vercel-only APIs, no Edge runtime exports. Scheduled jobs will be route handlers protected by a `CRON_SECRET` header.
6. **Timeline as audit trail.** Meaningful mutations (create, key field updates, stage changes, conversions, deletes) write a `timeline_events` row in the same transaction as the change.

## Data conventions

- CRM tables use `uuid` primary keys (`defaultRandom()`); Better Auth tables keep their own ID types.
- Standard columns: `workspace_id`, `created_at` and `updated_at` (timestamptz, default now), `created_by`, `deleted_at` (soft delete; default queries exclude deleted rows).
- Money is integer cents plus an ISO currency code (workspace default, USD).
- Statuses and kinds are Postgres enums (`pgEnum`).
- Tables are snake_case plural (`companies`, `timeline_events`); TypeScript uses camelCase.
- Schema v1 is defined in `docs/plan/iteration-1.md`.

## Database workflow

- Neon branches: `dev` for all development; `main` holds live data and is off-limits.
- `.env.local` has `DATABASE_URL` (dev branch, pooled, used by the app) and `DATABASE_URL_UNPOOLED` (dev branch, direct, used by drizzle-kit). Never ask for, print, or commit the `main` branch URLs or any other secret.
- Schema changes: edit the Drizzle schema, run `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Never use `drizzle-kit push`, and never edit a migration that has been applied; add a new one.
- Automated tests use the Docker Postgres from `docker-compose.yml` (`TEST_DATABASE_URL`), never Neon.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run locally at http://localhost:3000 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (run `docker compose up -d` first) |
| `pnpm build` | Next.js production build |
| `pnpm cf:build` | OpenNext Cloudflare build; must stay green |
| `pnpm db:generate` | Generate a migration from the Drizzle schema |
| `pnpm db:migrate` | Apply migrations to the dev branch |
| `pnpm db:seed` | Seed Statixx and Trazo demo data (dev only; requires `ALLOW_SEED=true`) |
| `pnpm db:studio` | Drizzle Studio |

Create any missing scripts during iteration 1.

## UI direction

- It's a daily-driver sales tool: dense, legible, calm, keyboard-friendly, and usable on a phone for quick logging right after a meeting.
- Each workspace has its own accent color (stored in `workspace_settings`), shown in the shell and the switcher, so it's always obvious whether you're working in Statixx or Trazo.
- Before styling beyond shadcn defaults, write a short token plan in `docs/design.md`: 4–6 named colors, one or two typefaces, radius, and density. Avoid template tells: a cream background with a terracotta accent, a black background with one neon accent, identical rounded cards with the same soft shadow everywhere, ALL-CAPS eyebrow labels, and arrows appended to button text.
- Copy: sentence case; buttons named for their action ("Add company", not "Submit"); empty states tell people what to do next; errors say what happened and how to fix it.
- Accessibility floor: visible focus states, labeled inputs, sufficient contrast, reduced motion respected.

## Working agreement

- One branch per iteration (`iteration-1/foundation`) and small commits using Conventional Commits.
- Before committing a phase, make sure `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm cf:build` pass.
- End each phase with a short report: what changed, how to verify it, and open questions.
- If you're blocked on credentials, finish everything that doesn't need them and list exactly what's missing. Don't stub around a missing credential silently.

### Ask first

Ask Isaac before you:

- add a dependency outside the stack above;
- change the tenancy model, or change the schema beyond what the plan defines;
- touch the Neon `main` branch, secrets, or any paid service;
- delete data or rewrite git history.

## Deploy notes (launch, not now)

- Cloudflare: Workers Paid plan; Hyperdrive in front of Neon with query caching disabled, because the CRM must read its own writes immediately; R2 for nightly backups.
- Vercel is the fallback if it's cheaper at launch; switching should need configuration only.
