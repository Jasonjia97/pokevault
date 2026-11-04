# PokéVault

PokéVault currently includes email/password authentication and Feature 2:
creating and viewing Pokémon sets. Card CRUD, stars, search, dashboard, wishlist,
and other planned features are not implemented.

## Run in Replit

The app uses PostgreSQL through `DATABASE_URL` and the session secret from
`SESSION_SECRET`.

1. Run `npm run db:migrate` to apply the idempotent SQL files in `migrations/`.
2. Run `npm run dev` and open the Replit preview.

Vite serves the preview on port 5000 and proxies `/api` requests to the Express
server on port 3001. The `sets` page requires a signed-in account. Set names
are saved in PostgreSQL and are only listed for their owner.

## Checks

- `npm test` runs the API and PostgreSQL tests.
- `npm run typecheck` checks TypeScript.
- `npm run build` builds the production client and server.