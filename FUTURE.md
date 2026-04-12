# Future Work

Ideas for future improvements, not yet prioritised.

- **Request recording with MSW** — record real SerpAPI/Anthropic responses as fixtures to keep test data realistic and reduce manual fixture maintenance
- **Separate test database** — run tests against an isolated Postgres database (e.g. a second database on the local Supabase instance) to prevent test cleanup from affecting dev data
- **fix second dev server** - Next.js doesn't permit multiple dev servers. So user cannot be running one locally and agent running tests.
