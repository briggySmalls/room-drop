# Future Work

Ideas for future improvements, not yet prioritised.

- **Request recording with MSW** — record real SerpAPI/Anthropic responses as fixtures to keep test data realistic and reduce manual fixture maintenance
- **Separate test database** — run tests against an isolated Postgres database (e.g. a second database on the local Supabase instance) to prevent test cleanup from affecting dev data
- **Deal link room extraction** — for rates without room-level detail in SerpAPI (the `prices` array), scrape the deal destination page to extract the actual room type. This would allow room-specific bookings to consider more sources beyond the ~6 that appear in `featured_prices`
- **Server Component data fetching** — replace client-side `fetch('/api/...')` calls with direct Supabase queries in Server Components, and swap POST API routes for Server Actions. Eliminates the API route middleman, removes client-side loading waterfalls, and reduces shipped JavaScript
