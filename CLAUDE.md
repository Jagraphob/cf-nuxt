# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Build for production
pnpm preview          # Build + run via wrangler locally (simulates CF environment)
pnpm deploy           # Build + deploy to Cloudflare Workers
pnpm cf-typegen       # Regenerate Cloudflare bindings types (worker-configuration.d.ts)
pnpm db:generate      # Diff lib/db/schema against migrations, emit new SQL migration files
pnpm db:migrate:local # Apply migrations to the local (.wrangler) D1 used by dev/preview
pnpm db:migrate:remote # Apply migrations to the real Cloudflare D1
```

## Architecture

This is a **Nuxt 4** app deployed to **Cloudflare Workers** (module preset) serving as a personal tools platform. It holds a shared layout/navbar shell with Google SSO login, plus one sub-app: **Family Accounting** (see below). `pages/index.vue` shows "Nothing to see here" when logged out and a grid of tool cards when logged in. New tools are added as sub-apps under `pages/`, `components/`, and `server/api/`, and registered in `lib/tools.ts` to appear on the home page.

### Family Accounting (`/family-accounting`)
A mobile-first household budget ledger replacing a Google Sheet. Self-contained: all its pages, components and API routes are namespaced, so other sub-apps stay independent of it.
- **Categories carry the direction.** Each category is `income`, `expense`, or `transfer`; a transaction's sign derives from its category, so the two can't contradict each other. `transfer` (e.g. "Saving") leaves the account like an expense but is excluded from spending analysis — a single savings transfer is often larger than every real expense combined. A category's `type` is deliberately not patchable.
- **Money is integer cents** (`amountCents`); SQLite REAL drifts when summed. Format only at the edges via `formatMoney()`. Negative amounts are legal and mean a refund.
- **Dates are ISO `YYYY-MM-DD` TEXT**, never epoch millis — NZ is UTC+12/13, so timestamps would land entries on the wrong day. This also makes `BETWEEN` ranges and `substr(date,1,7)` month grouping work directly in SQL. Build them with `toIsoDate()`, never `toISOString()`.
- **Categories archive rather than delete** once used. `DELETE` returns `409` with a transaction count when the category has history; the UI then offers archiving.
- **Running balance is never materialised** — `computeBalance()` recomputes it from the `settings` opening balance plus all later transactions. At a few hundred rows a year there is nothing to gain from a stored total that can drift.
- **API auth:** `middleware/auth.ts` is client-side only and does NOT protect endpoints. Every handler calls `requireFamilyUser(event)` from `server/utils/auth.ts` first (401 no session / 403 not allowlisted).
- **SSR data loading uses `useRequestFetch()`, not `$fetch`** — plain `$fetch` during SSR calls our own API without the session cookie and gets a 401. This is wired up once inside `useFamilyAccounting()`.
- Charts are hand-rolled (DaisyUI `progress` bars, inline SVG) to avoid a charting dependency in the Worker bundle.

#### Budgets
- **A budget is a plan, not money.** Budgets live in their own table, never in `transactions`, and never move the account balance. Putting them in the ledger would break the reconciliation.
- **Weeks run Monday–Sunday**, matching the original spreadsheet's rows ("5-11 Jan"). All period maths lives in `lib/periods.ts`, shared by server and client so both agree which week a date is in. It works in UTC deliberately — local `Date` arithmetic shifts days across NZ daylight-saving boundaries and would silently move entries into the wrong week twice a year.
- **Each budget is weekly or monthly**, chosen per category (grocery is a weekly rhythm, power and rates are monthly).
- **Rollover is on, in both directions.** Underspend and overspend both carry forward, so "remaining" is cumulative, not per-period. That makes it a simple subtraction rather than a period-by-period walk: `Σ(periods elapsed × amount) − Σ(spend since the budget began)`. The current period counts in full — a week's allowance exists on Monday, it doesn't accrue daily.
- **Budgets are effective-dated versions.** Changing an amount closes the current row and opens a new one instead of updating in place, so past periods keep the figure they were actually judged against. Both boundaries snap to a period start (`periodStart()`), which is what prevents a period being counted twice when an amount changes mid-week. `budgets.post.ts` handles this; don't bypass it with a direct UPDATE.
- Income categories can't be budgeted (a cap on incoming money is meaningless).
- `lib/db/seed/2026-ledger.sql` is the one-off import of the original spreadsheet (159 transactions); replaying it against the $3,951.00 opening balance reproduces the sheet's final $2,127.08 exactly.

### Auth (Google SSO via `nuxt-auth-utils`)
- Sign-in is Google-only, gated to an email allowlist in `server/utils/auth.ts` (`isAllowedEmail`) — anyone else is redirected to `/?error=unauthorized` without a session being created
- OAuth callback route: `server/routes/auth/google.get.ts` (maps to `/auth/google`, not `/api/auth/google` — `server/routes/` has no `/api` prefix)
- Session user shape (`id`, `name`, `email`, `avatar`) is typed via module augmentation in `types/auth.d.ts`
- Client-side: `useUserSession()` (auto-imported) exposes `loggedIn`, `user`, `clear()`; `components/app/auth-button.vue` renders the navbar sign-in button / avatar dropdown (Profile, Logout)
- `middleware/auth.ts` guards pages that require a session (applied via `definePageMeta({ middleware: ["auth"] })`, see `pages/profile.vue`)
- Secrets: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`, `NUXT_SESSION_PASSWORD` — set locally in `.env`/`.dev.vars`, and in production via `wrangler secret put <name>` (never committed to `wrangler.jsonc`)

### Cloudflare Bindings (via `event.context.cloudflare.env`)
- **`CF_NUXT_KV`** — Cloudflare KV namespace for key-value storage
- **`CF_NUXT_D1`** — Cloudflare D1 (SQLite) database; holds the family accounting tables — see Database below
- Bindings are accessed server-side only via Nitro event handlers

### Database (Drizzle ORM + D1)
- `drizzle.config.ts` — schema path `lib/db/schema/index.ts`, migrations output to `lib/db/migrations/`
- `lib/db/schema/index.ts` — barrel file; define tables in sibling files and re-export them here (`accounting.ts`)
- `server/utils/db.ts` — `useDb(event)` returns a Drizzle instance bound to `CF_NUXT_D1`
- Workflow: edit schema → `pnpm db:generate` → `pnpm db:migrate:local` (and `:remote` before/at deploy)
- `wrangler.jsonc`'s `d1_databases[].migrations_dir` points Wrangler at `lib/db/migrations`
- Seed rows (categories, opening balance) are appended to the generated migration SQL so tables and seeds apply atomically. Drizzle diffs against its snapshot JSON, not the SQL body, so editing the emitted file is safe.
- `lib/db/seed/` holds one-off data imports applied with `wrangler d1 execute --file`, outside the migration sequence.

### Key Directories
- `server/api/` — Nitro API routes (auto-mapped to `/api/*`)
- `server/routes/` — Nitro server routes (no `/api` prefix, e.g. the Google OAuth callback)
- `server/utils/` — Server-side utilities (auto-imported), e.g. `auth.ts`, `db.ts`
- `lib/db/` — Drizzle schema (`schema/`) and generated migrations (`migrations/`) for D1
- `lib/env.ts` — Build-time env validation via Zod (parsed at import time in `nuxt.config.ts`)
- `middleware/` — Nuxt route middleware (e.g. `auth.ts` session guard)
- `types/` — Ambient type declarations/module augmentations (e.g. `auth.d.ts` for the session `User` shape)
- `components/app/` — Shared app-level components (navbar, theme toggle, auth button, tool card)
- `components/family-accounting/` — Components for the family accounting sub-app
- `composables/` — Auto-imported client composables, e.g. `useFamilyAccounting()`
- `lib/tools.ts` — Registry of sub-apps rendered as cards on the home page
- `lib/periods.ts` — Monday-start week/month arithmetic for budgets; imported by both server and client
- `layouts/default.vue` — Default layout wrapping all pages with `AppNavBar`
- `layouts/family-accounting.vue` — Sub-app layout: navbar + bottom `dock` tab bar
- `public/` — PWA manifest and icons (installable to a phone home screen; no service worker)

### UI Stack
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (configured in `assets/css/main.css`)
- **DaisyUI v5** as a Tailwind plugin — use DaisyUI component classes (e.g., `btn`, `navbar`, `menu`, `dropdown`, `avatar`)
- Themes: `light` (default) and `dark` (prefers-dark), toggled via `@nuxtjs/color-mode` with `dataValue: "theme"`
- Icons via `@nuxt/icon` using the `tabler` icon set (e.g., `<Icon name="tabler:hammer" />`)

### Conventions
- New pages go in `pages/` and are auto-routed; register new sub-apps in `lib/tools.ts` to surface them on the home page
- Server handlers access CF bindings through `event.context.cloudflare.env`
- D1 interactions use Drizzle ORM via `useDb(event)`; schema lives in `lib/db/schema/`
- Guard every API route that touches user data with `requireFamilyUser(event)` — route middleware does not run on the server
- Validate request bodies and query params with `zod` and return `400` on failure rather than trusting input

### Known gaps
- `server/api/kv.ts` has no auth guard and is publicly writable
- `lib/db/sql/test.sql` is an unused leftover sample (a `Customers` table)

Note: all three of `NUXT_SESSION_PASSWORD`, `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` must be in **both** `.env` (used by `pnpm dev`) and `.dev.vars` (used by `pnpm preview`/wrangler). A missing `NUXT_SESSION_PASSWORD` surfaces as a 500 with "Empty password", not an auth failure.
