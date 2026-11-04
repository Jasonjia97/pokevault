# CSV export prompt and verification record

## Actual user prompt

> Read PLAN.md and schema.md.
>
> Work only on feature/csv-export.
>
> Implement a Download CSV button that exports the signed-in user's Pokémon cards, including owned and wishlist items.
>
> Include card name, set, card number, condition, purchase price, date, and status.
>
> Ensure correct CSV formatting, spreadsheet safety, and user privacy.
>
> Add automated tests and create prompts/csv-export.md.
>
> Preserve existing functionality. Run all tests and build checks. Do not push or merge automatically.

## Actual Agent responses

- “I’ll verify the branch/worktree, read the plan and schema, and inspect the existing card export points and privacy tests. Then I’ll add a user-scoped CSV download, test formatting and spreadsheet safety, document the actual prompt history, and run the full checks.”
- “The export endpoint now returns all of the signed-in user’s cards, both owned and wishlist, with the requested fields plus notes from the plan. The focused tests pass for privacy, CSV quoting, and formula-like values; I’m running the full suite and build before recording the final results in `prompts/csv-export.md`.”

## Implementation notes

- Added an authenticated `GET /api/cards/export.csv` endpoint. Its PostgreSQL query selects only cards whose `user_id` matches the signed-in session and includes both `owned` and `wishlist` statuses.
- Added a Download CSV link on the Cards and Wishlist list pages. The server sets an attachment filename and a no-store cache header.
- Export fields follow the plan: card name, set, card number, condition, purchase price, acquisition date, status, and notes.
- CSV output uses UTF-8 BOM and CRLF record separators, quotes every field, doubles embedded quotes, and prefixes spreadsheet-formula-like values with an apostrophe after leading whitespace/control characters.
- Automated tests check the headers, owned and wishlist data, commas/quotes in a card number, formula-like card name and notes, Bob's inability to download Alice's rows, and unauthenticated access.

## Actual verification results

Focused database tests:

```text
Test Files  1 passed (1)
Tests  8 passed (8)
```

Final full checks:

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
