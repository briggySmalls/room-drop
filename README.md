# Room Drop

Monitor hotel prices after booking and get alerted when a cheaper equivalent room becomes available — before your free cancellation deadline passes.

## Getting Started

```bash
npm run setup    # Check prerequisites, install deps, start local Supabase
npm run dev      # Start dev server at localhost:3000
```

Prerequisites: Node.js >= 20, Docker (running), Supabase CLI.

### Database

Migrations live in `supabase/migrations/` and are applied automatically by `npm run setup`. To reset the database and reload seed data:

```bash
npm run db:reset
```

Sample bookings are seeded from `supabase/seed.sql` — edit this file to change your local dev data.

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

### Supabase

| Variable                        | Description                         |
| ------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-side only) |

For local development, `npm run setup` starts a local Supabase instance. The default values are:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed by supabase start>
SUPABASE_SERVICE_ROLE_KEY=<printed by supabase start>
```

For production, create a project at [supabase.com](https://supabase.com) and copy the keys from **Settings → API**.

### Google OAuth

| Variable               | Description                    |
| ---------------------- | ------------------------------ |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 client ID     |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

Only needed for local development (production OAuth is configured in the Supabase dashboard). Create credentials at [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).

### SerpAPI (Google Hotels)

| Variable      | Description          |
| ------------- | -------------------- |
| `SERPAPI_KEY` | Your SerpAPI API key |

Sign up at [serpapi.com](https://serpapi.com). Your API key is on the [dashboard](https://serpapi.com/dashboard) after sign-in.

### Anthropic (room matching)

| Variable            | Description            |
| ------------------- | ---------------------- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

Create an API key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). The app uses Claude Haiku 4.5 for room comparison.

### Vercel Cron

| Variable      | Description                                |
| ------------- | ------------------------------------------ |
| `CRON_SECRET` | Secret token to authenticate cron requests |

Generate any random string (e.g. `openssl rand -hex 32`). On Vercel, this is set automatically via the Cron integration. Locally, trigger the cron endpoint with:

```bash
npm run cron
```

### Resend (email alerts)

| Variable            | Description                   |
| ------------------- | ----------------------------- |
| `RESEND_API_KEY`    | Your Resend API key           |
| `RESEND_FROM_EMAIL` | Verified sender email address |

Sign up at [resend.com](https://resend.com). Create an API key under **API Keys** in the dashboard. To send from a custom address, verify a domain under **Domains** — or use `onboarding@resend.dev` for testing. Alert emails are sent to the booking owner's email (from their auth profile).

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

## Deployment

Prerequisites: [Supabase CLI](https://supabase.com/docs/guides/cli), [Vercel CLI](https://vercel.com/docs/cli).

### Automated setup

The deploy script handles Supabase migration push, Vercel env vars, and production deploy:

```bash
supabase login     # one-time
vercel login       # one-time
npm run deploy
```

The script will:

1. Link your Supabase project and push migrations
2. Prompt for production Supabase keys (from dashboard → Settings → API)
3. Read external API keys from `.env.local` (SERPAPI, Anthropic, Resend)
4. Generate a `CRON_SECRET` automatically
5. Deploy to Vercel

### Manual steps

Google OAuth cannot be configured via CLI. After deploying:

1. **Google Cloud Console** → APIs & Services → Credentials
   - Create an OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

2. **Supabase Dashboard** → Authentication → Providers → Google
   - Enable the provider and paste the Client ID + Secret from step 1

3. **Supabase Dashboard** → Authentication → URL Configuration
   - Set **Site URL** to your Vercel deployment URL
   - Add `https://<your-vercel-domain>/auth/callback` to **Redirect URLs**

### Cron

Vercel runs the price check cron daily at 6am UTC (configured in `vercel.json`). The `CRON_SECRET` set by the deploy script authenticates these requests.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Supabase](https://supabase.com/) (Postgres)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [SerpAPI](https://serpapi.com/) (Google Hotels)
- [Claude Haiku](https://anthropic.com/) (room matching)
- [Resend](https://resend.com/) (email alerts)
