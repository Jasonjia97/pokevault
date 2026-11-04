# Card validation prompt and results

## Actual user prompt

> Read PLAN.md and inspect the existing code.
>
> Work only on feature/validation.
>
> Implement card form validation, requiring card name and set, rejecting invalid prices, and showing friendly inline error messages.
>
> Enforce validation on both frontend and backend. Add automated tests.
>
> Preserve all existing features.
>
> Create prompts/validation.md with the actual prompts and results.
>
> Run tests, type checks, and build. Do not push or merge automatically.

## Agent responses

- “I’ll inspect `PLAN.md`, verify the current branch and working tree, then locate the card form, validation endpoints, and related tests. I’ll keep existing behavior intact while adding frontend and backend validation.”
- “The form now validates required name, owned set selection, and nonnegative prices with up to two decimal places; the API already enforces the corresponding constraints, and I’ve expanded endpoint tests. I’ll run the focused and full checks, fix any failures, then document the actual results.”

## Changes

- Added a shared frontend validation helper for a nonblank card name, a set belonging to the user's loaded sets, and nonnegative prices with up to two decimal places.
- The card form runs its own validation and shows field-level messages with `aria-invalid`, `aria-describedby`, and alert semantics. Validation feedback clears when the affected field is edited.
- Kept the existing backend `parseCardPayload` checks, which validate card name, set ID, and price before insert/update. Expanded API tests to check missing name/set, negative and over-precision prices, and invalid update prices.
- Added automated unit tests for frontend validation, including valid price formats and malformed, negative, or out-of-range values.

## Actual verification results

Branch verified: `feature/validation`.

Commands run:

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
