# Search and sort prompt record

## Actual user prompt

> Read PLAN.md and inspect the existing app.
>
> Work exclusively on feature/search-sort.
>
> Implement case-insensitive card-name search, filtering by Pokémon set, and sorting by purchase price or acquisition date.
>
> Allow these controls to work together and ensure results remain private to the signed-in user.
>
> Preserve all existing functionality. Add tests and document the actual Agent prompt history in prompts/search-sort.md.
>
> Run tests, type checks, and build. Do not push or merge automatically.

## Actual Agent responses

- “I’ll read `PLAN.md`, confirm the branch and working tree, and inspect the card list/API and existing tests. I’ll also check the project’s date-handling note because acquisition-date sorting depends on the database’s date format.”
- “The existing card list already carries the Favorites state and the API scopes cards by owner. I’m adding allowlisted server-side filters/sorts so searches and combined controls operate only on the signed-in user’s rows, then I’ll extend the current two-user test without adding extra signup requests.”
- “The search, set filter, and sort controls are now connected to the authenticated API, including the Favorites view. I’ve added combination and ownership checks; I’ll run the full checks now and adjust anything the results uncover.”

## Implementation notes

- Added card-name substring search using PostgreSQL `ILIKE`, a set filter, and allowlisted sort modes for purchase price ascending/descending and acquisition date newest/oldest. The existing recently-added ordering remains the default.
- Search, set, and sort values are combined in the API query. The API still applies the signed-in user's `user_id` filter before returning cards; Favorites uses the same controls with the user's own star records.
- Extended the two-user integration test to verify case-insensitive search, combined search + set + price sorting, acquisition-date sorting, and that another user's request with the same filters returns no cards.
- Acquisition dates continue to be returned as `YYYY-MM-DD`, consistent with the existing date-only API format.

## Actual verification results

Final command sequence: `npm test && npm run typecheck && npm run build`

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
