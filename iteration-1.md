# Iteration 1: local prototype foundation (M1)

## Goal

A Next.js app on localhost where you sign in with Google, land in a workspace, switch between Statixx and Trazo, and see seeded data served from the Neon `dev` branch. Workspace isolation is enforced in the service layer and proven by tests, and CI shows the app still builds for Cloudflare.

## Exit check

1. Run `pnpm dev`, open http://localhost:3000, choose "Continue with Google", and sign in with an email listed in `BOOTSTRAP_OWNER_EMAILS`.
2. You land in a workspace. The switcher lists Statixx and Trazo, each with its own accent color.
3. The workspace home shows counts from Neon (companies, contacts, open deals, pipeline stages) that differ between the two workspaces.
4. A Google account that isn't allowlisted or invited is refused with a clear message.
5. `pnpm test` passes, including the isolation suite, and CI is green on the pull request, including `cf:build`.

## Credentials

Phases 1–4 need no credentials; build and test against the Docker database. Phase 5 needs `.env.local` with `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BOOTSTRAP_OWNER_EMAILS`, and `ALLOW_SEED=true`. If anything is missing when you reach Phase 5, stop and list it.

## Phase 1: scaffold and tooling

- [ ] Scaffold Next.js (latest stable) in the repo root: TypeScript strict, App Router, Tailwind, `src/` directory, `@/*` import alias, pnpm. Keep existing repo files.
- [ ] Initialize shadcn/ui; add components only as you use them.
- [ ] Set up ESLint and Prettier, and add the scripts listed in AGENTS.md (stub the ones that land in later phases).
- [ ] `src/env.ts`: Zod-validated server env covering the variables above, plus `TEST_DATABASE_URL` and `CRON_SECRET` as optional. Allow skipping validation only with an explicit flag that CI builds use.
- [ ] Commit `.env.example` with placeholders and a comment per variable; confirm `.env*.local` is gitignored.
- [ ] Add `@opennextjs/cloudflare` and `wrangler` (dev dependency) with a minimal `wrangler.jsonc` and `open-next.config.ts`, so `pnpm cf:build` works locally. No deploy and no Cloudflare account needed.

Commit: `chore: scaffold app and tooling`

## Phase 2: database layer and schema v1

- [ ] `docker-compose.yml`: Postgres (same major version as the Neon project) on port 5433 for tests, plus Mailpit (SMTP 1025, web UI 8025).
- [ ] `src/server/db/`: `getDatabaseUrl()`, `getDb()` (request-scoped, per AGENTS.md), schema files, and relations.
- [ ] `drizzle.config.ts` loads `.env.local` and uses `DATABASE_URL_UNPOOLED`.
- [ ] Generate Better Auth's tables into the Drizzle schema with Better Auth's CLI, with the organization plugin enabled so the organization, member, and invitation tables exist. If the CLI needs a module-level `auth` export, put it in a CLI-only file the app never imports.
- [ ] CRM schema v1. Every table follows the conventions in AGENTS.md.
  - `workspace_settings`: workspace_id (primary key and foreign key), accent_color, default_currency
  - `pipelines`: name, is_default
  - `pipeline_stages`: pipeline_id, name, position, default_probability, kind (open, won, lost)
  - `companies`: name, domain, industry, size, lifecycle_status (prospect, onboarding, active, at_risk, past), owner_id
  - `contacts`: company_id (nullable), first_name, last_name, email, phone, title, linkedin_url, source, owner_id
  - `leads`: name, email, company_name, source, status (new, contacted, qualified, disqualified), owner_id, converted_at, converted_contact_id, converted_company_id, converted_deal_id
  - `deals`: title, company_id, primary_contact_id, pipeline_id, stage_id, kind (new, expansion, renewal), value_type (one_time, recurring), amount_cents, currency, billing_period (monthly, annual; null for one-time), probability, expected_close_date, closed_at, loss_reason, owner_id
  - `subscriptions`: company_id, deal_id (nullable), plan_name, mrr_cents, currency, billing_period, start_date, renewal_date, status (active, cancelled)
  - `activities`: type (call, meeting, email, note), subject, body, occurred_at, subject_type, subject_id, author_id
  - `tasks`: title, due_at, status (open, done), assignee_id, subject_type, subject_id
  - `timeline_events`: event_type, subject_type, subject_id, actor_id, payload (jsonb), occurred_at
  - `tags`: name, color; `taggings`: tag_id, subject_type, subject_id
  - Indexes: `workspace_id` on every table, plus `(workspace_id, stage_id)` on deals; `(workspace_id, subject_type, subject_id)` on activities, tasks, timeline_events, and taggings; and `(workspace_id, lower(email))` on contacts and leads.
- [ ] `pnpm db:generate` produces the initial migration; read the SQL before moving on.
- [ ] Vitest setup: a global setup migrates the Docker test database, a helper resets tables between tests, and a helper creates two test workspaces and returns a ctx for each.
- [ ] Minimal `src/server/services/companies.ts`: `listCompanies`, `getCompany`, `createCompany`, `updateCompany`, and `softDeleteCompany`, each writing timeline events as AGENTS.md requires.
- [ ] Isolation tests: with workspace A's ctx, workspace B's companies can't be listed, read, updated, or deleted (reads return nothing; writes fail with a not-found error and change no rows), and a create writes exactly one timeline event.

Commit: `feat(db): schema v1, request-scoped client, isolation tests`

## Phase 3: auth, workspaces, and app shell

- [ ] `getAuth()` factory: Better Auth with the Drizzle adapter over `getDb()`, the Google provider, the organization plugin, and `baseURL` from `BETTER_AUTH_URL`.
- [ ] `src/app/api/auth/[...all]/route.ts` delegates GET and POST to `getAuth().handler`.
- [ ] Invite-only access: a user-creation hook rejects any email that isn't in `BOOTSTRAP_OWNER_EMAILS` and has no pending invitation. Bootstrap owners become `owner` of every workspace on first sign-in. The sign-in page shows a clear message when an account is refused.
- [ ] `requireSession()`, `requireWorkspace(slug)`, and a role-check helper (owner, admin, member).
- [ ] Routes: `/sign-in` with a single "Continue with Google" button; `/` redirects to the last-used workspace (cookie) or the first one; `/[workspace]` home with the seeded counts; `/[workspace]/settings/members` as a read-only member list.
- [ ] Shell: sidebar (Home, Leads, Deals, Companies, Contacts, Tasks), where sections not built yet show an empty state saying they arrive in the next iteration; a workspace switcher with accent colors; a user menu with sign out.
- [ ] Write `docs/design.md` (see "UI direction" in AGENTS.md) and apply it to the shell.
- [ ] Tests: `requireWorkspace` rejects non-members and unknown slugs; the invite-only hook admits bootstrap owners and invited emails and rejects everyone else.

Commit: `feat(auth): google sign-in, workspaces, app shell`

## Phase 4: CI

- [ ] `.github/workflows/ci.yml` on push and pull request: install with pnpm caching; lint; typecheck; test against a Postgres service container (run migrations first); then `pnpm build` and `pnpm cf:build` with dummy env values. No repository secrets needed.

Commit: `ci: lint, typecheck, test, build, cloudflare build`

## Phase 5: connect to Neon and verify (needs `.env.local`)

- [ ] `pnpm db:migrate` against the Neon dev branch.
- [ ] `pnpm db:seed`, which is idempotent and refuses to run unless `ALLOW_SEED=true`. It creates:
  - Statixx (slug `statixx`) with the consulting pipeline: Qualified, Discovery, Proposal/SOW Sent, Negotiation, Won, Lost
  - Trazo (slug `trazo`) with the subscription pipeline: Qualified, Discovery, Demo, Pilot, Proposal, Negotiation, Won, Lost
  - Per workspace, obviously fake demo data: about 8 companies, 15 contacts, 6 leads, and 8 deals across stages (Statixx deals one-time, Trazo deals recurring with MRR), plus 2–3 active Trazo subscriptions and a few tasks and activities
- [ ] Run the exit check end to end and report the results, including anything that needs Isaac.

Commit: `feat(seed): demo data for statixx and trazo`

## Not in this iteration

CRUD screens for leads, deals, and contacts; the Kanban; search; dashboard charts; sending email (log invite links to the console for now); CSV import and real data; deployment.
