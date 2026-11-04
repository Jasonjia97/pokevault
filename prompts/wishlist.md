# Wishlist feature prompt and verification record

## Actual user prompt

> Read PLAN.md and schema.md.
>
> Work only on feature/wishlist.
>
> Implement a Wishlist page where users can track cards they want to buy, distinguish wishlist cards from owned cards, and move wishlist cards to owned status.
>
> Ensure wishlist cards are excluded from owned-card counts, spending totals, and owned-set charts.
>
> Persist changes in PostgreSQL and enforce user privacy.
>
> Preserve all existing features, add automated tests, and create prompts/wishlist.md with the actual prompt history.
>
> Run all tests and build checks. Do not push or merge automatically.

## Actual Agent responses

- “I’ll first confirm the current branch and worktree, then read the plan/schema and trace the existing card status, dashboard, and card-page flows. I’ll make the wishlist changes within `feature/wishlist`, add privacy/status regression tests and the prompt log, then run the full checks.”
- “The app already stores a `status` column, and the dashboard already excludes wishlist rows. I’ll build on that existing model: add authenticated status filtering, a separate Wishlist view and create flow, explicit status labels, and a user-scoped move-to-owned action—without changing the schema.”
- “The wishlist API, view, create flow, status badges, and move-to-owned action are in place, with a two-user test covering the dashboard totals before and after the move. I’m running typecheck and the focused card tests now to catch integration issues before the full suite.”
- “The focused database tests and typecheck now pass. I also folded the wishlist assertions into the existing two-user test after an initial run hit the signup rate limit; the final test still exercises Alice, Bob, dashboard exclusion, and the move-to-owned transition. I’ll run the full suite and production build next.”

## Implementation notes

- Reused the existing PostgreSQL `cards.status` column (`owned` or `wishlist`); no schema migration was needed.
- Added authenticated status filtering for card lists, a separate Wishlist page and creation flow, status labels in lists/details, and a status update endpoint for moving a card between states.
- All list and update queries remain scoped to the signed-in user. A different user receives an empty private list or `404` when attempting to change the card status.
- The existing dashboard query already counts only owned cards, sums only owned-card purchase prices, and charts only owned cards by set. The tests now verify those values before and after moving a wishlist card to owned.

## Automated test coverage

The existing two-user card-isolation test also covers the wishlist flow to avoid adding extra account signups that hit the app's signup rate limit:

- Alice has two owned cards priced at `$20` and `$30`, plus a `$100` wishlist card. Before moving it, her dashboard reports 2 owned cards and `$50.00`; the chart counts only the two owned cards.
- Bob has his own `$999` owned card. Alice's wishlist view does not show Bob's records; Bob cannot change Alice's wishlist card.
- Alice moves her wishlist card to owned. It disappears from her wishlist, appears in her owned list, and her dashboard updates to 3 owned cards and `$150.00`. Bob's dashboard remains scoped to his own card.

An initial focused run failed because the separate new test exceeded the signup rate limit (`429`). The wishlist coverage was then folded into the existing Alice/Bob integration test, and the focused database test passed.

## Actual verification results

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
