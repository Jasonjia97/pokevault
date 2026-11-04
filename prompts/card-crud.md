# Card CRUD prompt and test record

## Actual user prompt

> Read PLAN.md and schema.md.
>
> Work only on feature/card-crud.
>
> Implement Pokémon card creation, listing, detail page, editing, and deletion with confirmation. Save cards in PostgreSQL and enforce user ownership on all server endpoints.
>
> Add the required automated data-isolation test using two users. Produce real failing and passing test evidence by temporarily introducing and then reverting a deliberate bug.
>
> Document actual AI prompts and testing in prompts/card-crud.md.
>
> Preserve authentication and set management. Do not build future features or modify main.
>
> Run all tests, type checks, and the production build. Do not push or merge automatically.

## Agent responses and implementation notes

- Before implementation, the Agent said it would verify the branch and working tree, read `PLAN.md` and `schema.md`, inspect the existing API/UI/tests, and work only on `feature/card-crud`.
- The inspected schema already had the `cards` table, nonnegative purchase-price constraint, owner foreign keys, and composite set ownership constraint; no schema migration was needed.
- The card endpoints scope list, detail, update, and delete queries to the authenticated user. Create and update also verify that the selected set belongs to that user.
- The UI adds a card list, detail route, create/edit form, and browser confirmation before deletion. Authentication and set management remain in place. Stars, search, dashboard, and other later features were not added.
- The first CRUD test run exposed date serialization: PostgreSQL returned `2025-03-04T00:00:00.000Z` while the date input and API expect `2025-03-04`. The card query now formats dates as `YYYY-MM-DD`.

## Red/green ownership-test evidence

The test `isolates card listing, details, edits, deletion, and set assignment by user` creates Alice and Bob, creates Alice's card, then checks Bob's list and direct endpoints.

For the deliberate regression, the owner filter was temporarily removed from the `GET /api/cards` query. The command
`npx vitest run tests/database-sets.test.ts -t "isolates card listing"` failed
with this real output:

```text
FAIL tests/database-sets.test.ts > PokéVault authentication and set ownership
  > isolates card listing, details, edits, deletion, and set assignment by user
AssertionError: expected [ { …(10) } ] to have a length of +0 but got 1
Tests  1 failed | 7 skipped (8)
```

The owner filter was restored immediately. The same focused command then passed:

```text
Test Files  1 passed (1)
Tests  1 passed | 7 skipped (8)
```

## Final checks

After restoring the deliberate bug:

```text
npm test
Test Files  2 passed (2)
Tests  12 passed (12)

npm run typecheck
passed

npm run build
Vite production build passed; server TypeScript build passed.
```

The tests also cover card creation, listing, detail, editing, deletion, missing
names, negative prices, unauthenticated access, and cross-user set assignment.

A live preview check also passed signup, set/card creation, card list/detail/edit,
delete, and the expected not-found response for the deleted card. The temporary
test account was removed.
