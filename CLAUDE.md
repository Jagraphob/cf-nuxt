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

This is a **Nuxt 4** app deployed to **Cloudflare Workers** (module preset) serving as a personal tools platform. The repo holds the shared layout/navbar shell plus Google SSO login — all other sub-apps have been removed, and `pages/index.vue` just shows a "Nothing to see here" message when logged out. New tools are added as sub-apps under `pages/`, `components/`, and `server/api/`.

### Auth (Google SSO via `nuxt-auth-utils`)
- Sign-in is Google-only, gated to an email allowlist in `server/utils/auth.ts` (`isAllowedEmail`) — anyone else is redirected to `/?error=unauthorized` without a session being created
- OAuth callback route: `server/routes/auth/google.get.ts` (maps to `/auth/google`, not `/api/auth/google` — `server/routes/` has no `/api` prefix)
- Session user shape (`id`, `name`, `email`, `avatar`) is typed via module augmentation in `types/auth.d.ts`
- Client-side: `useUserSession()` (auto-imported) exposes `loggedIn`, `user`, `clear()`; `components/app/auth-button.vue` renders the navbar sign-in button / avatar dropdown (Profile, Logout)
- `middleware/auth.ts` guards pages that require a session (applied via `definePageMeta({ middleware: ["auth"] })`, see `pages/profile.vue`)
- Secrets: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`, `NUXT_SESSION_PASSWORD` — set locally in `.env`/`.dev.vars`, and in production via `wrangler secret put <name>` (never committed to `wrangler.jsonc`)

### Cloudflare Bindings (via `event.context.cloudflare.env`)
- **`CF_NUXT_KV`** — Cloudflare KV namespace for key-value storage
- **`CF_NUXT_D1`** — Cloudflare D1 (SQLite) database, no tables defined yet — see Database below
- Bindings are accessed server-side only via Nitro event handlers

### Database (Drizzle ORM + D1)
- `drizzle.config.ts` — schema path `lib/db/schema/index.ts`, migrations output to `lib/db/migrations/`
- `lib/db/schema/index.ts` — barrel file; define tables in sibling files and re-export them here
- `server/utils/db.ts` — `useDb(event)` returns a Drizzle instance bound to `CF_NUXT_D1`
- Workflow: edit schema → `pnpm db:generate` → `pnpm db:migrate:local` (and `:remote` before/at deploy)
- `wrangler.jsonc`'s `d1_databases[].migrations_dir` points Wrangler at `lib/db/migrations`

### Key Directories
- `server/api/` — Nitro API routes (auto-mapped to `/api/*`)
- `server/routes/` — Nitro server routes (no `/api` prefix, e.g. the Google OAuth callback)
- `server/utils/` — Server-side utilities (auto-imported), e.g. `auth.ts`, `db.ts`
- `lib/db/` — Drizzle schema (`schema/`) and generated migrations (`migrations/`) for D1
- `lib/env.ts` — Build-time env validation via Zod (parsed at import time in `nuxt.config.ts`)
- `middleware/` — Nuxt route middleware (e.g. `auth.ts` session guard)
- `types/` — Ambient type declarations/module augmentations (e.g. `auth.d.ts` for the session `User` shape)
- `components/app/` — Shared app-level components (navbar, theme toggle, auth button)
- `layouts/default.vue` — Default layout wrapping all pages with `AppNavBar`

### UI Stack
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (configured in `assets/css/main.css`)
- **DaisyUI v5** as a Tailwind plugin — use DaisyUI component classes (e.g., `btn`, `navbar`, `menu`, `dropdown`, `avatar`)
- Themes: `light` (default) and `dark` (prefers-dark), toggled via `@nuxtjs/color-mode` with `dataValue: "theme"`
- Icons via `@nuxt/icon` using the `tabler` icon set (e.g., `<Icon name="tabler:hammer" />`)

### Conventions
- New pages go in `pages/` and are auto-routed
- Link new app pages from `components/app/nav-bar.vue` (currently just the theme toggle + auth button)
- Server handlers access CF bindings through `event.context.cloudflare.env`
- D1 interactions use Drizzle ORM via `useDb(event)`; schema lives in `lib/db/schema/`
