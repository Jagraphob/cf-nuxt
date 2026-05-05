# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server at http://localhost:3000
pnpm build        # Build for production
pnpm preview      # Build + run via wrangler locally (simulates CF environment)
pnpm deploy       # Build + deploy to Cloudflare Workers
pnpm cf-typegen   # Regenerate Cloudflare bindings types (worker-configuration.d.ts)
```

## Architecture

This is a **Nuxt 4** app deployed to **Cloudflare Workers** (module preset) serving as a personal tools platform.

### Cloudflare Bindings (via `event.context.cloudflare.env`)
- **`CF_NUXT_KV`** — Cloudflare KV namespace for key-value storage
- **`CF_NUXT_D1`** — Cloudflare D1 (SQLite) database
- Bindings are accessed server-side only via Nitro event handlers

### Key Directories
- `server/api/` — Nitro API routes (auto-mapped to `/api/*`)
- `server/routes/` — Nitro server routes
- `server/utils/` — Server-side utilities
- `lib/db/` — Drizzle ORM schema and SQL files for D1
- `lib/env.ts` — Build-time env validation via Zod (parsed at import time in `nuxt.config.ts`)
- `components/app/` — Shared app-level components (navbar, theme toggle)
- `layouts/default.vue` — Default layout wrapping all pages with `AppNavBar`

### UI Stack
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (configured in `assets/css/main.css`)
- **DaisyUI v5** as a Tailwind plugin — use DaisyUI component classes (e.g., `btn`, `navbar`, `menu`)
- Themes: `light` (default) and `dark` (prefers-dark), toggled via `@nuxtjs/color-mode` with `dataValue: "theme"`
- Icons via `@nuxt/icon` using the `tabler` icon set (e.g., `<Icon name="tabler:hammer" />`)

### Conventions
- New pages go in `pages/` and are auto-routed
- Add new app pages to the nav dropdown in `components/app/nav-bar.vue`
- Server handlers access CF bindings through `event.context.cloudflare.env`
- D1 interactions use Drizzle ORM; schema lives in `lib/db/`
