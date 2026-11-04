# Dashboard prompt and verification record

## Actual user prompt

> Read PLAN.md and schema.md.
>
> Work exclusively on feature/dashboard.
>
> Build a dashboard showing total cards, total purchase spending, total starred cards, and a chart of cards by Pokémon set.
>
> Calculate all statistics from the signed-in user's database records.
>
> Add the required automated test verifying two cards priced at $20 and $30 produce total spending of $50.
>
> Create real failing and passing test screenshots by temporarily introducing and fixing a calculation bug.
>
> Save screenshots in docs/testing/ and actual prompt history in prompts/dashboard.md.
>
> Preserve existing functionality and run all tests and build checks.
>
> Do not push or merge automatically.

## Actual Agent responses

- “I’ll inspect the plan, schema, branch, and existing card/statistics code first. I’ll use the project’s chart guidance, add a user-scoped dashboard endpoint and view, then demonstrate the total-spending test failing and passing with real screenshots.”
- “The deliberate calculation bug produced the expected failure: including the $100 wishlist card made spending $150.00 instead of $50.00. I’m restoring the owned-only sum and rerunning the focused test before saving both screenshots.”

## Implementation and test

- Added an authenticated `/api/dashboard` endpoint. Counts, spending, stars, and per-set owned-card counts are queried from PostgreSQL and scoped to the session user.
- Added dashboard totals and an accessible horizontal bar chart of owned cards by set, with navigation from sets and card pages.
- The test creates two owned cards priced at $20 and $30 and a $100 wishlist card, then checks total owned cards = 2, total spending = `$50.00`, starred count, per-set chart data, and that another user sees only their own empty totals.
- To create the real red result, the owned-status condition was temporarily removed from the spending sum. The focused test failed with expected `$50.00`, received `$150.00`. The condition was restored immediately; the same test then passed.
- Captured raw output and screenshots: `docs/testing/dashboard-red.txt`, `dashboard-red.jpg`, `dashboard-green.txt`, and `dashboard-green.jpg`. The JPGs are browser captures rendering the actual captured Vitest output.

## Actual final checks

```text
npm test
Test Files  3 passed (3)
Tests  21 passed (21)

npm run typecheck
passed

npm run build
Vite production build passed.
Server TypeScript build passed.
```

No push or merge was performed.
