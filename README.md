# Room Drop

Monitor hotel prices after booking and get alerted when a cheaper equivalent room becomes available — before your free cancellation deadline passes.

## Getting Started

```bash
npm run setup    # Check prerequisites, install deps, start local Supabase
npm run dev      # Start dev server at localhost:3000
```

Prerequisites: Node.js >= 20, Docker (running), Supabase CLI.

### Database Migrations

Migrations live in `supabase/migrations/` and are applied automatically by `npm run setup`. To apply manually:

```bash
supabase db push
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

### Supabase

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

For local development, `npm run setup` starts a local Supabase instance. The default values are:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed by supabase start>
```

For production, create a project at [supabase.com](https://supabase.com) and copy the URL and anon key from **Settings → API**.

### SerpAPI (Google Hotels)

| Variable | Description |
|---|---|
| `SERPAPI_KEY` | Your SerpAPI API key |

Sign up at [serpapi.com](https://serpapi.com). Your API key is on the [dashboard](https://serpapi.com/dashboard) after sign-in.

### Anthropic (room matching)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

Create an API key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). The app uses Claude Haiku 4.5 for room comparison.

### Vercel Cron

| Variable | Description |
|---|---|
| `CRON_SECRET` | Secret token to authenticate cron requests |

Generate any random string (e.g. `openssl rand -hex 32`). On Vercel, this is set automatically via the Cron integration. Locally, trigger the cron endpoint with:

```bash
npm run cron
```

## Code Quality

```bash
npm run lint           # ESLint
npm run format         # Prettier (auto-fix)
npm run format:check   # Prettier (check only)
```

CI runs lint, format check, build, and Playwright tests on every push/PR to `master`.

## Testing

```bash
npx playwright test              # Run all tests
npx playwright test --ui         # Interactive Playwright UI
```

Playwright starts the Next.js dev server automatically. MSW intercepts external API calls inside the server process when `NODE_ENV=test`.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Supabase](https://supabase.com/) (Postgres)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [SerpAPI](https://serpapi.com/) (Google Hotels)
- [Claude Haiku](https://anthropic.com/) (room matching)
- [Resend](https://resend.com/) (email alerts)
