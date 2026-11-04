# PokéVault

PokéVault provides email/password signup, login, logout, password hashing, and
persistent PostgreSQL sessions. Signed-in users can create and view their own
Pokémon sets. Card CRUD, stars, search, dashboard, wishlist, and other planned
features are not implemented.

## Run in Replit

Set `DATABASE_URL` and a private `SESSION_SECRET` in the environment. Run
`npm run db:migrate` to apply the idempotent SQL migrations, then start the app
with `npm run dev`.

Vite serves the preview on port 5000 and proxies `/api` requests to Express on
port 3001. Set records are persisted in PostgreSQL and scoped to their owner.
For a production build, use `npm run build` and `npm start` with
`NODE_ENV=production` and `PORT=5000`.

## Checks

- `npm test` exercises authentication, session persistence, set ownership, and
  database constraints.
- `npm run typecheck` checks TypeScript.
- `npm run build` builds the production client and server.

Passwords are stored as bcrypt hashes. Sessions use HTTP-only, same-site
cookies and are persisted in PostgreSQL for seven days.
