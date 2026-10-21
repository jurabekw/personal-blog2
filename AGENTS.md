<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (Jurabek Blog)

- Next.js 16 App Router, no Cache Components. Public routes use ISR (`revalidate = 3600`) and are refreshed on every admin change via `revalidateSite()` in `src/lib/revalidate.ts`.
- Data: Postgres via Drizzle (`src/lib/db/schema.ts`). Generate migrations with `npm run db:generate`; `scripts/migrate.mjs` runs them before `next build`.
- Settings are JSON groups (`general`, `reading`, `appearance`, `menus`, `seo`) merged over `DEFAULT_SETTINGS` in `src/lib/settings-defaults.ts` — add new fields there, no migration needed.
- Public markup and CSS come from the WordPress theme (`src/styles/theme.css` is its style.css). Keep `jb-*` class names when changing templates.
- Every server action must start with `requireUser(...)`; sanitize HTML with `sanitizeContent`, plain text with `sanitizePlain`.
- `npm test` runs unit tests with tsx (`--conditions=react-server` so `server-only` modules load).
