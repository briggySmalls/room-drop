# Hotel Price Hacker ("room-drop") — Architecture Plan

## Context

We're building a personal tool that monitors hotel prices after booking and alerts the user when a cheaper equivalent room becomes available — before the free cancellation deadline passes. The project is greenfield (empty repo, no git). The goal is a low-cost, low-infra MVP that a solo dev can ship quickly.

---

## Tech Stack

| Layer         | Choice                                              | Why                                                                                                                                                                              |
| ------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | Next.js (App Router) + TypeScript                   | Single deployable for UI + API routes. First-class SDKs for all services.                                                                                                        |
| **Database**  | Supabase (Postgres, free tier)                      | Managed Postgres. No extensions needed (no pg_cron, no pg_net). Free.                                                                                                            |
| **Scheduler** | Vercel Cron (`vercel.json`)                         | Daily schedule. Vercel auto-sets `CRON_SECRET` for auth — no public endpoint exposure. Zero config.                                                                              |
| **Scraping**  | SerpAPI Google Hotels                               | Free tier: 250 searches/month. Structured JSON with refundable flags + multi-source prices. Bright Data's $250 minimum is too expensive for a personal project.                  |
| **LLM**       | Claude Haiku 4.5 (Anthropic SDK)                    | ~$0.001 per room comparison. Structured JSON output for match/upgrade/downgrade verdicts.                                                                                        |
| **Email**     | Resend                                              | Free tier: 3,000 emails/month. TypeScript SDK + React Email templates.                                                                                                           |
| **Hosting**   | Vercel (Hobby/Free)                                 | Free. 10s function timeout — if this becomes a bottleneck, move the cron handler to a Supabase Edge Function (150s timeout, also free). Hobby plan supports daily cron natively. |
| **Testing**   | Playwright + MSW v2 + Supabase CLI (local Postgres) | One test world. E2E through the browser for UI, direct API calls for backend flows. MSW runs inside Next.js server process to stub external APIs.                                |

**Estimated monthly cost: ~$1–2** (LLM tokens only; everything else is free tier).

---

## System Architecture

```
[User Browser]
     │
     ▼
[Next.js on Vercel]
     ├── /bookings/new          → Booking ingestion form
     ├── /                      → Dashboard (active bookings, scan history)
     ├── POST /api/bookings     → CRUD
     └── GET /api/cron/check-prices   ◄── Vercel Cron (daily via vercel.json)
              │
              │  Pipeline:
              │  0. Expire bookings past cancellation date
              │  1. For each active booking: SerpAPI call (hotel + dates)
              │  2. Refundable filter (or all-rates if ≤3 days to cancellation)
              │  3. Claude Haiku room comparison → structured JSON verdict
              │  4. Threshold check (% or absolute savings)
              │  5. Dedup check (don't re-alert same deal within 24h)
              │  6. Send email via Resend (with booking link + cancellation reminder)
              │  7. Store scan result
              │
[Supabase Postgres]
     └── Tables: bookings, scan_results, alerts_sent, app_config
```

### Key Pipeline Details

- **Refundable filter**: If `days_until_cancellation > non_refundable_window_days` → only refundable rates. If `≤ non_refundable_window_days` → include non-refundable. Configurable per booking (`non_refundable_window_days` column, default 3).
- **LLM matching**: Haiku returns `{ verdict, confidence, reasoning }`. Verdicts of "match" or "upgrade" pass through. Below 0.6 confidence → still alert but with a "please verify" caveat. If `accept_downgrades = true` on the booking, "downgrade" verdicts also pass through.
- **Dedup**: Check `alerts_sent` for same booking + source within 24h before sending.
- **Expiry**: Runs as the first step of the daily cron — sets `status = 'expired'` on bookings past their cancellation date before checking prices.

---

## Database Schema

Each table is introduced in the commit that delivers the user story requiring it — not all at once.

### `bookings` — User's existing hotel reservations (Commit 1)

| Column                       | Type                   | Notes                                              |
| ---------------------------- | ---------------------- | -------------------------------------------------- |
| `id`                         | UUID PK                |                                                    |
| `hotel_name`                 | TEXT NOT NULL          |                                                    |
| `hotel_location`             | TEXT                   | Helps SerpAPI accuracy                             |
| `check_in_date`              | DATE NOT NULL          |                                                    |
| `check_out_date`             | DATE NOT NULL          |                                                    |
| `room_type`                  | TEXT NOT NULL          | User's description, e.g. "Deluxe King, City View"  |
| `num_guests`                 | INTEGER DEFAULT 2      |                                                    |
| `current_price`              | NUMERIC(10,2) NOT NULL | Total price (not per-night)                        |
| `currency`                   | TEXT DEFAULT 'GBP'     |                                                    |
| `cancellation_date`          | TIMESTAMPTZ NOT NULL   | Free cancellation deadline                         |
| `cancellation_url`           | TEXT                   | How to cancel original                             |
| `original_booking_source`    | TEXT                   | "Booking.com", etc.                                |
| `original_confirmation`      | TEXT                   | Confirmation number                                |
| `threshold_percent`          | NUMERIC(5,2)           | e.g. 10.00 = 10% drop                              |
| `threshold_absolute`         | NUMERIC(10,2)          | e.g. 50.00 = £50 drop                              |
| `non_refundable_window_days` | INTEGER DEFAULT 3      | Days before cancellation to include non-refundable |
| `status`                     | TEXT DEFAULT 'active'  | active / paused / expired / cancelled              |
| `created_at`                 | TIMESTAMPTZ            |                                                    |
| `updated_at`                 | TIMESTAMPTZ            |                                                    |

Constraints: `check_out > check_in`, at least one threshold set.

### `app_config` — Single-row config (Commit 1)

| Column               | Type                      | Notes      |
| -------------------- | ------------------------- | ---------- |
| `id`                 | INTEGER PK (enforced = 1) | Single row |
| `notification_email` | TEXT NOT NULL             |            |

### `scan_results` — Every price check performed (Commit 2)

| Column            | Type                  | Notes                               |
| ----------------- | --------------------- | ----------------------------------- |
| `id`              | UUID PK               |                                     |
| `booking_id`      | UUID FK → bookings    |                                     |
| `scanned_at`      | TIMESTAMPTZ           |                                     |
| `filter_mode`     | TEXT                  | 'refundable_only' or 'all_rates'    |
| `raw_response`    | JSONB                 | Full SerpAPI response for debugging |
| `best_price`      | NUMERIC(10,2)         | NULL if no deal                     |
| `best_source`     | TEXT                  |                                     |
| `best_room_desc`  | TEXT                  |                                     |
| `best_link`       | TEXT                  | Direct booking link                 |
| `is_refundable`   | BOOLEAN               |                                     |
| `llm_verdict`     | TEXT                  | match / upgrade / downgrade         |
| `llm_confidence`  | NUMERIC(3,2)          |                                     |
| `llm_reasoning`   | TEXT                  |                                     |
| `savings_amount`  | NUMERIC(10,2)         |                                     |
| `savings_percent` | NUMERIC(5,2)          |                                     |
| `alert_triggered` | BOOLEAN DEFAULT FALSE |                                     |

### `alerts_sent` — Deduplication & delivery tracking (Commit 3)

| Column            | Type                   | Notes                               |
| ----------------- | ---------------------- | ----------------------------------- |
| `id`              | UUID PK                |                                     |
| `booking_id`      | UUID FK → bookings     |                                     |
| `scan_result_id`  | UUID FK → scan_results |                                     |
| `sent_at`         | TIMESTAMPTZ            |                                     |
| `email_to`        | TEXT                   |                                     |
| `deal_price`      | NUMERIC(10,2)          |                                     |
| `deal_source`     | TEXT                   |                                     |
| `deal_link`       | TEXT                   |                                     |
| `savings_amount`  | NUMERIC(10,2)          |                                     |
| `savings_percent` | NUMERIC(5,2)           |                                     |
| `is_refundable`   | BOOLEAN                |                                     |
| `resend_id`       | TEXT                   | For delivery tracking               |
| `status`          | TEXT                   | sent / delivered / bounced / failed |

---

## Project Structure

```
room-drop/
  src/
    app/
      page.tsx                          # Dashboard
      bookings/new/page.tsx             # Booking ingestion form
      bookings/[id]/page.tsx            # Booking detail + scan history
      api/
        bookings/route.ts               # CRUD
        cron/check-prices/route.ts      # Core pipeline endpoint (Vercel Cron)
    instrumentation.ts                  # Conditionally starts MSW in test mode
    lib/
      db.ts                             # Supabase client
      scraper.ts                        # SerpAPI integration
      llm.ts                            # Claude Haiku room matching
      email.ts                          # Resend integration
      types.ts                          # Shared types
      constants.ts                      # Config defaults
    components/                         # React UI components
    emails/                             # React Email templates
  supabase/
    migrations/                         # Incremental SQL migrations (one per story)
  tests/
    e2e/                                # Playwright E2E tests
      bookings.spec.ts
      check-prices.spec.ts
      alerts.spec.ts
      expiry.spec.ts
    fixtures/                           # Recorded external API response fixtures
      serpapi/
      anthropic/
      resend/
    msw/
      handlers.ts                       # MSW request handlers (load from fixtures)
      server.ts                         # MSW setupServer for Next.js process
  .env.local                            # API keys (gitignored)
  .env.test                             # Test env pointing to local Supabase
  .env.example                          # Documented env var template
  package.json
  tsconfig.json
  playwright.config.ts
  vercel.json                           # Cron schedule config
```

---

## Testing Strategy

**Philosophy: One test world. Real database, real Next.js server, stubbed external APIs.**

### How It Works

1. **Test environment**: Next.js dev server running with `NODE_ENV=test`. Local Supabase via `supabase start`. MSW `setupServer()` initialized inside Next.js's `instrumentation.ts` to intercept external API calls (SerpAPI, Anthropic, Resend) within the server process.

2. **UI flows** (booking form, dashboard): Playwright drives the browser — navigate, fill forms, click, assert on page content.

3. **Backend/API flows** (cron pipeline, expiry): Playwright's `request.post()` calls API endpoints directly — no browser overhead. Assert on response + query Supabase from the test to verify database state.

4. **Fixtures**: JSON files containing recorded responses from SerpAPI, Anthropic, and Resend. One set of fixtures, loaded by MSW inside the server process. Covers both UI and API test paths. Fixtures are captured manually during local dev (run against real APIs once, save the response). Consider `@mswjs/source` (`fromTraffic()` with HAR files) if fixture maintenance becomes painful.

5. **Database state**: Each test seeds its own data into local Postgres and cleans up after. Tests can query Supabase directly to assert on rows created/updated by the pipeline.

### Test Runner Commands

```bash
supabase start                           # Start local Postgres
npx playwright test                      # Run all tests
npx playwright test tests/e2e/bookings   # Run specific test file
npx playwright test --ui                 # Interactive Playwright UI
```

---

## Design Decisions

1. **Single-user, no auth for MVP.** Adding auth is pure overhead for a personal tool. The `app_config` table stores the notification email. Migration to multi-user later is straightforward (add users table + FK).

2. **Vercel Cron (daily) instead of pg_cron.** Eliminates pg_cron and pg_net Supabase extensions entirely. Vercel auto-sets `CRON_SECRET` and verifies it — no manual secret management. Daily frequency is acceptable for MVP (price drops caught within 24h). Trade-off: no sub-daily checks on Hobby plan. Expiry runs as the first step of the daily price check, not as a separate job.

3. **SerpAPI over Bright Data.** Bright Data has a $250/month minimum. SerpAPI's free tier (250 searches/month) covers ~8 active bookings with daily checks. Limitation: property-level pricing, not room-level — the LLM step compensates by evaluating room descriptions.

4. **LLM confidence threshold with fallback.** When Haiku confidence < 0.6, still alert the user but with a "please verify" caveat. Avoids missing genuine deals due to insufficient scrape data.

5. **One-world E2E testing.** Playwright + local Supabase + MSW-in-server. Single set of external API fixtures. No Vitest. Acceptable speed trade-off for fixture simplicity and full-stack coverage.

---

## Implementation Sequence

See [COMMITS.md](./COMMITS.md) for the full commit plan with Gherkin test specifications.

Summary:

- [x] **Commit 0a**: `chore: scaffold Next.js project` (`d13ca04`)
- [x] **Commit 0b**: `chore: add linter, formatter, and CI pipeline` (`18eaf88`)
- [x] **Commit 0c**: `chore: add Playwright and MSW test infrastructure` (`d19bdc5`)
- [x] **Commit 1**: `feat: add booking ingestion with deal thresholds` (`ae80ea6`)
- [x] **Commit 2**: `feat: add continuous price checking with room matching` (`ac03643`)
- [x] **Commit 3**: `feat: add booking expiry and cleanup` (`56ba2e2`)
- [x] **Commit 4**: `feat: add email alerts with actionable handoff` (`9d59a8b`)
- [ ] **Commit 5**: `feat: add non-refundable window for last-minute prices`
- [ ] **Commit 6**: `feat: add room downgrade preference toggle`

### Additional commits (not in original plan)

- `feat: centralise env validation with fail-fast startup` (`a050a58`)
- `chore: add setup script for prerequisites` (`b533367`)
- `chore: add database seed and dev convenience scripts` (`efaa243`)
- `refactor: add TypeScript union types for domain strings` (`2bb91ca`)
- `feat: add scan status tracking to price checks` (`b8e9b9d`)
- `chore: use real notification email in dev seed` (`48c42a6`)
- `fix: handle SerpAPI direct property match response` (`def3046`)
