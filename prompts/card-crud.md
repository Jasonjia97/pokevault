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

## Latest data-isolation verification request

> Work only on feature/card-crud.
>
> Ensure the automated data-isolation test verifies that User B cannot view User A's card.
>
> Run the test, temporarily introduce an authorization bug to demonstrate a genuine failure, then restore the secure code and rerun it successfully.
>
> Save actual screenshots in docs/testing/, or give me instructions to capture them manually.
>
> Record the actual commands, Agent responses, and results in prompts/card-crud.md.
>
> Do not fabricate results or push or merge automatically.

## Latest test run and actual Agent responses

- Agent: “I’ll confirm the branch and inspect the existing two-user test and card-list ownership filter, then run the test normally, demonstrate a real failure with the filter temporarily removed, restore it, and rerun. I’ll record only the commands and results produced in this run.”
- The branch was `feature/card-crud`. The test now explicitly asserts Bob’s card list does not contain Alice’s created card ID, and separately verifies Bob’s direct detail request returns 404.
- Secure baseline command: `npx vitest run tests/database-sets.test.ts -t "isolates card listing"` — exit 0; 1 passed, 7 skipped, at 03:44:12.
- Deliberate regression: temporarily removed `WHERE c.user_id = $1` and its authenticated-user parameter from `GET /api/cards`.
- Same test command with the regression — exit 1; 1 failed, 7 skipped, at 03:44:24. The assertion failed because Bob’s list contained Alice’s exact `Private card` (and another card), including Alice’s card ID.
- Agent: “The deliberate regression produced the expected genuine failure: Bob’s list included Alice’s exact ‘Private card,’ and the new assertion caught its ID. I’m restoring the owner filter now, then I’ll rerun the focused test and save fresh red/green captures.”
- Restored the `WHERE c.user_id = $1` filter and parameter. Same test command — exit 0; 1 passed, 7 skipped, at 03:44:40.
- Captured the actual test-output text in `docs/testing/card-isolation-red.txt` and `docs/testing/card-isolation-green.txt`. The corresponding browser screenshots of those captured outputs are `docs/testing/card-isolation-red.jpg` and `docs/testing/card-isolation-green.jpg`.
- No push or merge was performed.

## Agent responses and implementation notes

- The Agent said: “I’ll first verify the current branch and working tree, then read `PLAN.md`, `schema.md`, and the existing card-related API, UI, and tests. I’ll keep all implementation work on `feature/card-crud` and won’t touch `main`.”
- The inspected schema already had the `cards` table, nonnegative purchase-price constraint, owner foreign keys, and composite set ownership constraint; no schema migration was needed.
- The card endpoints scope list, detail, update, and delete queries to the authenticated user. Create and update also verify that the selected set belongs to that user.
- The UI adds a card list, detail route, create/edit form, and browser confirmation before deletion. Authentication and set management remain in place. Stars, search, dashboard, and other later features were not added.
- The first CRUD test run exposed date serialization: PostgreSQL returned `2025-03-04T00:00:00.000Z` while the date input and API expect `2025-03-04`. The card query now formats dates as `YYYY-MM-DD`.
- During the evidence rerun, the Agent said: “The reproduced failure is real: with the list filter removed, Bob’s empty-list assertion failed because the endpoint returned cards. After restoring the filter, the same focused test passed. I’m saving both captured outputs and temporarily rendering them as static preview pages so I can save screenshots under `docs/testing/`; I’ll remove those temporary pages afterward.”
- Before the final checks, the Agent said: “Both screenshots are saved in `docs/testing/`, the temporary preview pages are removed, and `prompts/card-crud.md` now records the exact red/green rerun and Agent responses. I’ll run the full suite, typecheck, and production build once more with the owner filter restored.”

## Red/green ownership-test evidence

The test `isolates card listing, details, edits, deletion, and set assignment by user` creates Alice and Bob, creates Alice's card, then checks Bob's list and direct endpoints.

For the deliberate regression, the `WHERE c.user_id = $1` owner filter was
temporarily removed from the `GET /api/cards` query. This command exited 1:

```text
npx vitest run tests/database-sets.test.ts -t "isolates card listing"
❯ tests/database-sets.test.ts (8 tests | 1 failed | 7 skipped)
FAIL isolates card listing, details, edits, deletion, and set assignment by user
AssertionError: expected [ { …(10) }, { …(10) } ] to have a length of +0 but got 2
Test Files  1 failed (1)
Tests  1 failed | 7 skipped (8)
RED_EXIT_CODE=1
```

The owner filter was restored immediately. The same command exited 0:

```text
npx vitest run tests/database-sets.test.ts -t "isolates card listing"
Test Files  1 passed (1)
Tests  1 passed | 7 skipped (8)
GREEN_EXIT_CODE=0
```

The captured output files and screenshots are in `docs/testing/`:

- `card-isolation-red.txt` and `card-isolation-red.jpg`
- `card-isolation-green.txt` and `card-isolation-green.jpg`

The screenshots show the captured Vitest output in a temporary preview page;
those temporary pages were removed after capture.

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
