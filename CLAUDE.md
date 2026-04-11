# Room Drop — Project Context

## What is this?

A personal tool that monitors hotel prices after booking and alerts when a cheaper equivalent room becomes available — before the free cancellation deadline passes.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Database:** Supabase (Postgres)
- **Styling:** Tailwind CSS v4
- **Scraping:** SerpAPI Google Hotels
- **LLM:** Claude Haiku 4.5 (room comparison)
- **Email:** Resend
- **Hosting:** Vercel

## Local Development

```bash
npm install
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm run format     # Prettier (auto-fix)
```

## Testing

```bash
npx playwright test      # Run all E2E tests
npx playwright test --ui # Interactive UI
```

Playwright auto-starts Next.js dev server. MSW intercepts external APIs (SerpAPI, Anthropic, Resend) inside the server process when `NODE_ENV=test` via `src/instrumentation.ts`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `master`: install → lint → format check → build → Playwright tests.

## Project Structure

```
src/
  app/             # Next.js App Router pages and API routes
  lib/             # Shared utilities (db, scraper, llm, email)
  components/      # React UI components
  emails/          # React Email templates
supabase/
  migrations/      # Incremental SQL migrations
tests/
  e2e/             # Playwright E2E tests
  fixtures/        # Recorded external API response fixtures
  msw/             # MSW request handlers
```

## Conventions

- Single-user app, no auth
- All prices stored as totals (not per-night)
- Default currency: GBP
- Commit messages follow conventional commits (feat:, fix:, refactor:, chore:, etc.)
