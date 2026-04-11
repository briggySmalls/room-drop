# Room Drop

Monitor hotel prices after booking and get alerted when a cheaper equivalent room becomes available — before your free cancellation deadline passes.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

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
