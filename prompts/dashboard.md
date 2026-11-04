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
- “I’ll verify the existing dashboard test, the ownership exclusion, and saved red/green evidence first. If those are complete, I’ll report their exact results, update the prompt log with the evidence, then run the full tests and build without changing dashboard behavior.”
- “The prior red/green artifacts and screenshots are present. I’m checking the test fixture and dashboard query to confirm the `$50` case also explicitly proves another user’s cards are excluded, then I’ll run the requested full tests/build and update the prompt log with the exact current results.”
- “The existing test covered another user seeing no Alice-owned data, but Bob had no card of his own, so Alice’s spending total wasn’t directly tested against another user’s purchase. I added a Bob-owned `$999` card. Removing the user filter produced a real failure (`$1829.00` instead of `$50.00`); the user-scoped query is restored and the focused test passes. I’m running the full checks now.”

## Implementation and test

- Added an authenticated `/api/dashboard` endpoint. Counts, spending, stars, and per-set owned-card counts are queried from PostgreSQL and scoped to the session user.
- Added dashboard totals and an accessible horizontal bar chart of owned cards by set, with navigation from sets and card pages.
- The test creates two owned cards priced at $20 and $30 and a $100 wishlist card, then checks total owned cards = 2, total spending = `$50.00`, starred count, per-set chart data, and that another user sees only their own empty totals.
- To create the real red result, the owned-status condition was temporarily removed from the spending sum. The focused test failed with expected `$50.00`, received `$150.00`. The condition was restored immediately; the same test then passed.
- Captured raw output and screenshots: `docs/testing/dashboard-red.txt`, `dashboard-red.jpg`, `dashboard-green.txt`, and `dashboard-green.jpg`. The JPGs are browser captures rendering the actual captured Vitest output.

## Cross-user spending verification

Review found the original fixture had no Bob-owned card, so it did not directly prove that Alice's spending excluded a different user's purchase. The test now gives Alice owned cards priced at $20 and $30 plus a $100 wishlist card, and gives Bob a separate owned card priced at $999. It asserts Alice's total remains `$50.00`, Bob sees only his own `$999.00` and set count, and unauthenticated access returns 401.

For a genuine failing run, the `user_id = $1` predicate was temporarily removed from the dashboard spending sum. The actual focused run failed at the `$50.00` assertion with expected `$50.00`, received `$1829.00` (all owned rows visible to that deliberately unscoped query). The ownership predicate was restored, and the focused run passed.

Actual focused-run output:

```text
Red:   1 failed | 7 skipped; expected "50.00", received "1829.00"; EXIT_CODE=1
Green: 1 passed | 7 skipped; EXIT_CODE=0
```

Evidence files for this explicit cross-user test:

- `docs/testing/dashboard-ownership-red.txt`
- `docs/testing/dashboard-ownership-red.jpg`
- `docs/testing/dashboard-ownership-green.txt`
- `docs/testing/dashboard-ownership-green.jpg`

## Actual final checks

```text
npm test
Test Files  3 passed (3)
Tests  21 passed (21)

npm run typecheck
tsc --noEmit passed

npm run build
Vite production build passed (19 modules).
Server TypeScript build passed.
```

No push or merge was performed.
