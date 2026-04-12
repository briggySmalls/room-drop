# Hotel Price Hacker — Commit Plan & Test Specifications

Test scenarios are specified in Gherkin (Given/When/Then). Each scenario maps to a Playwright test case.

---

## Commit 0a: `chore: scaffold Next.js project`

**Scope**: Project skeleton. No user stories delivered.

### What

- `npx create-next-app@latest` with TypeScript, App Router, Tailwind
- Supabase JS client (`@supabase/supabase-js`)
- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Default `src/app/page.tsx` renders "Room Drop" heading
- `README.md` — project purpose, local dev setup (`npm install`, `npm run dev`)
- `CLAUDE.md` — project-level dev context (stack, conventions, how to run)

### Verification

- `npm run dev` serves the hello world page at `localhost:3000`
- `npm run build` succeeds with zero errors

---

## Commit 0b: `chore: add linter, formatter, and CI pipeline`

**Scope**: Code quality tooling + GitHub Actions. No user stories delivered.

### What

- ESLint (Next.js default config) + Prettier
- `npm run lint` and `npm run format` scripts
- `.github/workflows/ci.yml` — on push/PR: install → lint → build
- Update `README.md` with linting instructions
- Update `CLAUDE.md` with CI details

### Verification

- `npm run lint` passes on existing code
- `npm run format -- --check` passes
- Push to GitHub → Actions workflow runs green

---

## Commit 0c: `chore: add Playwright and MSW test infrastructure`

**Scope**: E2E test harness. No user stories delivered, but includes a smoke test.

### What

- `@playwright/test`, `msw` dependencies
- `playwright.config.ts` — base URL `localhost:3000`, `webServer` config to start Next.js
- `tests/msw/server.ts` — MSW `setupServer()` (empty handlers for now)
- `tests/msw/handlers.ts` — handler registry (empty)
- `src/instrumentation.ts` — conditionally start MSW when `NODE_ENV=test`
- `.env.test` — `NODE_ENV=test`, local Supabase URL
- `tests/e2e/smoke.spec.ts` — smoke test
- CI pipeline updated: install Playwright browsers, run `npx playwright test`
- Update `README.md` with testing instructions (`supabase start`, `npx playwright test`)

### Test Specification

```gherkin
Feature: Smoke Test
  Verify the application loads and the test infrastructure works.

  Scenario: Application renders the home page
    Given the Next.js dev server is running
    When I navigate to "/"
    Then I should see the heading "Room Drop"
```

---

## Commit 1: `feat: add booking ingestion with deal thresholds`

**Delivers**: _Booking Ingestion_ + _Deal Thresholds_ (Must Have)

### What

- Supabase migration `001_create_bookings.sql`: `bookings` + `app_config` tables
- `src/lib/db.ts` — Supabase client (server + browser)
- `src/lib/types.ts` — `Booking`, `AppConfig` types
- `GET /api/bookings` — list active bookings, `POST /api/bookings` — create booking
- `/bookings/new` — ingestion form: hotel name, location, check-in/out, room type, guests, price, currency, cancellation date, booking source, confirmation number, threshold %, threshold £
- `/` — dashboard listing active bookings (hotel name, dates, price, status)
- Update `.env.example` with Supabase vars
- Update `README.md` with Supabase migration instructions (`supabase db push`)

### Test Specification

```gherkin
Feature: Booking Ingestion
  As a user, I want to input my current hotel booking details
  so the system knows what to monitor.

  Background:
    Given the local Supabase database is running
    And the "bookings" table is empty

  Scenario: Successfully create a booking via the form
    Given I am on the "/bookings/new" page
    When I fill in the booking form with:
      | field                  | value                  |
      | Hotel Name             | The Ritz London        |
      | Location               | London, UK             |
      | Check-in Date          | 2026-06-15             |
      | Check-out Date         | 2026-06-18             |
      | Room Type              | Deluxe King, City View |
      | Number of Guests       | 2                      |
      | Total Price            | 1200.00                |
      | Currency               | GBP                    |
      | Free Cancellation Date | 2026-06-10             |
      | Booking Source         | Booking.com            |
      | Confirmation Number    | BC-9283746             |
      | Min Price Drop %       | 10                     |
    And I submit the form
    Then I should be redirected to the dashboard "/"
    And I should see "The Ritz London" in the bookings list
    And the "bookings" table should contain 1 row
    And that row should have status "active"

  Scenario: Booking requires at least one deal threshold
    Given I am on the "/bookings/new" page
    When I fill in the booking form without any threshold values
    And I submit the form
    Then I should see a validation error about setting a threshold

  Scenario: Check-out date must be after check-in date
    Given I am on the "/bookings/new" page
    When I fill in check-in as "2026-06-18" and check-out as "2026-06-15"
    And I submit the form
    Then I should see a validation error about invalid dates

  Scenario: Dashboard lists only active bookings
    Given the following bookings exist:
      | hotel_name       | status   |
      | The Ritz London  | active   |
      | Hotel Marylebone | expired  |
    When I navigate to "/"
    Then I should see "The Ritz London"
    And I should not see "Hotel Marylebone"
```

---

## Commit 2: `feat: add continuous price checking with intelligent room matching`

**Delivers**: _Continuous Checking_ + _Refundable Check_ + _Intelligent Matching_ (Must Have)

### What

- Supabase migration `002_create_scan_results.sql`: `scan_results` table
- `src/lib/scraper.ts` — SerpAPI Google Hotels client. Accepts hotel name + location + dates, returns structured price results with `free_cancellation` flag, source name, room description, booking link
- `src/lib/llm.ts` — Claude Haiku room comparison. System prompt returns `{ verdict, confidence, reasoning }`. Verdicts: `match`, `upgrade`, `downgrade`
- `GET /api/cron/check-prices` — core pipeline:
  1. Verify `CRON_SECRET` header (auto-set by Vercel Cron)
  2. Fetch active bookings where `cancellation_date > NOW()`
  3. For each booking: call SerpAPI → filter by refundable status → for each cheaper result, call Haiku for room comparison → check against thresholds → store `scan_results` row
- `vercel.json` — cron schedule: `{ "crons": [{ "path": "/api/cron/check-prices", "schedule": "0 6 * * *" }] }`
- `src/instrumentation.ts` updated: MSW handlers for SerpAPI + Anthropic APIs in test mode
- `tests/fixtures/serpapi/hotel-search-ritz.json` — recorded SerpAPI response
- `tests/fixtures/anthropic/room-match.json`, `room-downgrade.json` — recorded Haiku responses
- `tests/msw/handlers.ts` updated with SerpAPI + Anthropic handlers
- `/bookings/[id]` — booking detail page: hotel info, scan history table, current status
- Update `.env.example` with `SERPAPI_KEY`, `ANTHROPIC_API_KEY`
- Update `README.md` with SerpAPI + Anthropic setup, Vercel Cron config
- Update `CLAUDE.md` with cron details

### Test Specification

```gherkin
Feature: Continuous Price Checking
  As the system, I need to check market prices daily
  to catch price drops for monitored bookings.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting SerpAPI and Anthropic API calls
    And the "scan_results" table is empty

  Scenario: Pipeline creates a scan result when a cheaper matching room is found
    Given an active booking exists:
      | hotel_name        | The Ritz London        |
      | check_in_date     | 2026-06-15             |
      | check_out_date    | 2026-06-18             |
      | room_type         | Deluxe King, City View |
      | current_price     | 1200.00                |
      | threshold_percent | 10                     |
      | cancellation_date | 2026-06-10T23:59:00Z   |
    And SerpAPI returns a result with price 1000.00 and free_cancellation true
    And Claude Haiku returns verdict "match" with confidence 0.9
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then the response status should be 200
    And the "scan_results" table should contain 1 row for this booking
    And that row should have:
      | best_price      | 1000.00         |
      | filter_mode     | refundable_only |
      | llm_verdict     | match           |
      | savings_percent | 16.67           |

  Scenario: Pipeline rejects requests without valid CRON_SECRET
    When I GET "/api/cron/check-prices" without the Vercel CRON_SECRET header
    Then the response status should be 401

  Scenario: Pipeline skips bookings past their cancellation date
    Given an active booking exists with cancellation_date in the past
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then the "scan_results" table should contain 0 rows

  Scenario: Pipeline records a scan even when no cheaper rates are found
    Given an active booking exists with current_price 500.00
    And SerpAPI returns no results cheaper than 500.00
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then the "scan_results" table should contain 1 row
    And that row should have best_price NULL

  Scenario: Pipeline filters to refundable rates only when far from cancellation
    Given an active booking exists with cancellation_date 30 days from now
    And SerpAPI returns results:
      | price   | free_cancellation |
      | 900.00  | false             |
      | 1100.00 | true              |
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then the scan result should have filter_mode "refundable_only"
    And the pipeline should NOT have evaluated the 900.00 non-refundable rate
```

```gherkin
Feature: Intelligent Room Matching
  As the system, I must use an LLM to evaluate cheaper rooms against
  the original so I do not alert users to a worse room.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting SerpAPI and Anthropic API calls

  Scenario: LLM identifies a room as a match
    Given an active booking for "Deluxe King, City View"
    And SerpAPI returns a cheaper "Deluxe King Room" at 1000.00
    And Claude Haiku returns verdict "match" with confidence 0.85
    When the pipeline processes this booking
    Then the scan result should have llm_verdict "match"
    And the scan result should have llm_confidence 0.85

  Scenario: LLM identifies a room as a downgrade — result stored but not alerted
    Given an active booking for "Deluxe King, City View"
    And SerpAPI returns a cheaper "Standard Twin Room" at 800.00
    And Claude Haiku returns verdict "downgrade" with confidence 0.92
    When the pipeline processes this booking
    Then the scan result should have llm_verdict "downgrade"
    And the scan result should have alert_triggered false

  Scenario: LLM returns low confidence — scan stores the result with caveat
    Given an active booking for "Deluxe King, City View"
    And SerpAPI returns a cheaper "Room" at 950.00
    And Claude Haiku returns verdict "match" with confidence 0.4
    When the pipeline processes this booking
    Then the scan result should have llm_verdict "match"
    And the scan result should have llm_confidence 0.4
```

---

## Commit 3: `feat: add booking expiry and cleanup`

**Delivers**: _Expiry & Cleanup_ (Must Have)

Adds expiry logic as a new step at the top of the existing `GET /api/cron/check-prices` route. Same cron job, new behaviour.

### What

- Add expiry step to `check-prices` route: before fetching active bookings, run `UPDATE bookings SET status = 'expired' WHERE cancellation_date < NOW() AND status = 'active'`
- The subsequent price-checking logic (from Commit 2) already filters by `status = 'active'`, so expired bookings are automatically excluded
- No new route, no new cron schedule — just a new step in the existing pipeline

### Test Specification

```gherkin
Feature: Booking Expiry and Cleanup
  As the system, I need to automatically stop tracking a booking once
  the user's cancellation cutoff date has passed to save compute.

  Background:
    Given the local Supabase database is running

  Scenario: Booking is expired during daily cron run
    Given an active booking exists with cancellation_date "2026-04-01T23:59:00Z"
    And today is "2026-04-11"
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then that booking should have status "expired"
    And no SerpAPI call should have been made for that booking

  Scenario: Active booking with future cancellation date is not expired
    Given an active booking exists with cancellation_date "2026-06-10T23:59:00Z"
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then that booking should have status "active"

  Scenario: Mixed bookings — only past-cancellation ones are expired
    Given the following bookings exist:
      | hotel_name       | status | cancellation_date        |
      | The Ritz London  | active | 2026-06-10T23:59:00Z     |
      | Hotel Marylebone | active | 2026-03-01T23:59:00Z     |
    And MSW is intercepting SerpAPI calls
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then "Hotel Marylebone" should now have status "expired"
    And "The Ritz London" should still have status "active"
    And SerpAPI should have been called once (for The Ritz only)
    And the "scan_results" table should contain 1 row
```

---

## Commit 4: `feat: add email alerts with actionable handoff`

**Delivers**: _Email Notification_ + _Actionable Handoff_ (Must Have)

### What

- Supabase migration `003_create_alerts_sent.sql`: `alerts_sent` table
- `src/lib/email.ts` — Resend client wrapper
- `src/emails/deal-found.tsx` — React Email template containing:
  - Hotel name, dates, original price vs new price
  - Savings amount + percentage
  - Direct booking link (from SerpAPI result)
  - Room comparison summary (from LLM reasoning)
  - Cancellation reminder: deadline date + cancellation URL
  - Non-refundable warning (if applicable, for timeline shift in Commit 5)
- Wire into pipeline: after threshold check → dedup check (same booking + source within 24h) → send email → insert `alerts_sent` row
- `tests/fixtures/resend/send-success.json` — recorded Resend response
- `tests/msw/handlers.ts` updated with Resend handler
- Update `.env.example` with `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Update `README.md` with Resend setup

### Test Specification

```gherkin
Feature: Email Alerts
  As a user, I want to receive an email notification when a valid deal
  is found that meets my thresholds and room requirements.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting SerpAPI, Anthropic, and Resend API calls
    And the "alerts_sent" table is empty

  Scenario: Alert email is sent when deal meets percentage threshold
    Given an active booking exists:
      | hotel_name        | The Ritz London |
      | current_price     | 1200.00         |
      | threshold_percent | 10              |
    And app_config has notification_email "user@example.com"
    And SerpAPI returns a matching room at 1000.00 (16.7% cheaper)
    And Claude Haiku returns verdict "match" with confidence 0.9
    When the Vercel Cron triggers GET "/api/cron/check-prices"
    Then MSW should have intercepted a POST to the Resend API
    And the email payload should contain "user@example.com" as recipient
    And the "alerts_sent" table should contain 1 row
    And that row should have savings_amount 200.00

  Scenario: Alert email is sent when deal meets absolute threshold
    Given an active booking exists:
      | hotel_name           | The Ritz London |
      | current_price        | 1200.00         |
      | threshold_percent    | NULL            |
      | threshold_absolute   | 50              |
    And SerpAPI returns a matching room at 1100.00 (£100 cheaper)
    And Claude Haiku returns verdict "match" with confidence 0.9
    When the pipeline processes this booking
    Then an alert email should be sent
    And the alert should have savings_amount 100.00

  Scenario: No alert when savings below both thresholds
    Given an active booking exists:
      | current_price        | 1200.00 |
      | threshold_percent    | 10      |
      | threshold_absolute   | 150     |
    And SerpAPI returns a matching room at 1190.00 (0.8% cheaper, £10 saving)
    When the pipeline processes this booking
    Then MSW should NOT have intercepted a POST to the Resend API
    And the "alerts_sent" table should contain 0 rows
    And the scan result should have alert_triggered false

  Scenario: No duplicate alert for the same deal within 24 hours
    Given an active booking exists for "The Ritz London"
    And an alert was already sent for this booking from "Booking.com" 6 hours ago
    And SerpAPI returns the same deal from "Booking.com" at the same price
    When the pipeline processes this booking
    Then MSW should NOT have intercepted a POST to the Resend API
    And the "alerts_sent" table should still contain only 1 row

  Scenario: New alert sent when a different source has a deal
    Given an active booking exists for "The Ritz London"
    And an alert was already sent for this booking from "Booking.com" 6 hours ago
    And SerpAPI returns a new deal from "Expedia" at a cheaper price
    And Claude Haiku returns verdict "match" with confidence 0.85
    When the pipeline processes this booking
    Then an alert email should be sent
    And the "alerts_sent" table should contain 2 rows
```

```gherkin
Feature: Actionable Handoff
  As a user, I want the email to contain a direct link to the new
  booking and a clear reminder of when/how to cancel my original.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting all external API calls

  Scenario: Email contains booking link and cancellation reminder
    Given an active booking exists:
      | hotel_name              | The Ritz London               |
      | cancellation_date       | 2026-06-10T23:59:00Z          |
      | cancellation_url        | https://booking.com/cancel/x  |
      | original_booking_source | Booking.com                   |
    And a deal is found with booking link "https://expedia.com/book/y"
    When the pipeline sends an alert email
    Then the email body should contain "https://expedia.com/book/y"
    And the email body should contain "10 June 2026"
    And the email body should contain "Booking.com"
    And the email body should contain "https://booking.com/cancel/x"
```

---

## Commit 5: `feat: add timeline shift for fire-sale prices`

**Delivers**: _Timeline Shift_ (Should Have)

### What

- Modify refundable filter in `check-prices` pipeline: when `days_until_cancellation <= booking.timeline_shift_days`, set `filter_mode = 'all_rates'`
- Update `deal-found.tsx` email template: prominent non-refundable warning banner when `is_refundable = false`
- Add `timeline_shift_days` field to booking form (optional, defaults to 3)

### Test Specification

```gherkin
Feature: Timeline Shift
  As the system, when close to the cancellation cutoff, I should start
  including non-refundable rates to snag last-minute fire-sale prices.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting all external API calls

  Scenario: Non-refundable rates included when within timeline shift window
    Given an active booking exists:
      | current_price       | 1200.00              |
      | cancellation_date   | 2026-04-13T23:59:00Z |
      | timeline_shift_days | 3                    |
      | threshold_percent   | 10                   |
    And today is "2026-04-11" (2 days before cancellation)
    And SerpAPI returns results:
      | price  | free_cancellation | source      |
      | 800.00 | false             | Hotels.com  |
    And Claude Haiku returns verdict "match" with confidence 0.88
    When the pipeline processes this booking
    Then the scan result should have filter_mode "all_rates"
    And an alert email should be sent
    And the scan result should have is_refundable false

  Scenario: Non-refundable rates excluded when outside timeline shift window
    Given an active booking exists:
      | current_price       | 1200.00              |
      | cancellation_date   | 2026-06-10T23:59:00Z |
      | timeline_shift_days | 3                    |
    And today is "2026-04-11" (60 days before cancellation)
    And SerpAPI returns only non-refundable rates
    When the pipeline processes this booking
    Then the scan result should have filter_mode "refundable_only"
    And no cheaper refundable rates should have been evaluated

  Scenario: Custom timeline shift window is respected
    Given an active booking exists:
      | cancellation_date   | 2026-04-18T23:59:00Z |
      | timeline_shift_days | 7                    |
    And today is "2026-04-11" (7 days before cancellation)
    And SerpAPI returns non-refundable rates
    When the pipeline processes this booking
    Then the scan result should have filter_mode "all_rates"

  Scenario: Fire-sale email includes non-refundable warning
    Given the pipeline finds a non-refundable deal during fire-sale mode
    When the alert email is sent
    Then the email body should contain a non-refundable warning
    And the email body should contain "NON-REFUNDABLE"
```

---

## Commit 6: `feat: add room downgrade preference toggle`

**Delivers**: _Advanced Room Preferences_ (Could Have)

### What

- Supabase migration: add `accept_downgrades` BOOLEAN DEFAULT FALSE to `bookings`
- Toggle on `/bookings/new` form
- Modify LLM pipeline: when `accept_downgrades = true`, "downgrade" verdicts also pass threshold check
- Update `deal-found.tsx` email: flag when a deal is a potential downgrade

### Test Specification

```gherkin
Feature: Room Downgrade Preference
  As a user, I want a toggle to indicate if I am willing to accept
  a lower-tier room for a massive price drop.

  Background:
    Given the local Supabase database is running
    And MSW is intercepting all external API calls

  Scenario: Downgrade alert sent when user opts in
    Given an active booking exists:
      | room_type          | Deluxe King Suite |
      | current_price      | 2000.00           |
      | threshold_percent  | 20                |
      | accept_downgrades  | true              |
    And SerpAPI returns a "Standard King Room" at 1400.00
    And Claude Haiku returns verdict "downgrade" with confidence 0.9
    When the pipeline processes this booking
    Then an alert email should be sent
    And the email body should indicate the room may be a downgrade

  Scenario: Downgrade not alerted when user has not opted in
    Given an active booking exists:
      | room_type          | Deluxe King Suite |
      | current_price      | 2000.00           |
      | threshold_percent  | 20                |
      | accept_downgrades  | false             |
    And SerpAPI returns a "Standard King Room" at 1400.00
    And Claude Haiku returns verdict "downgrade" with confidence 0.9
    When the pipeline processes this booking
    Then no alert email should be sent
    And the scan result should have alert_triggered false

  Scenario: Downgrade toggle visible on booking form
    Given I am on the "/bookings/new" page
    Then I should see a toggle for "Accept room downgrades"
    And it should default to unchecked
```
