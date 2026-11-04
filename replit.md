# PokéVault on Replit

## Current scope

PokéVault includes email/password signup, login, logout, hashed passwords,
persistent PostgreSQL sessions, and per-user Pokémon set creation and listing.
Cards and stars exist only as relational tables; card CRUD, starring, search,
dashboard, wishlist, export, and other planned features are not implemented.

## Run and verify

- Set `DATABASE_URL` and a private `SESSION_SECRET` in Replit Secrets.
- Run `npm run db:migrate` to apply the SQL migrations to the development database.
- Start the app with `npm run dev` (preview on port 5000; API on port 3001).
- Run `npm test`, `npm run typecheck`, and `npm run build` for validation.

Vite proxies `/api` requests to Express. Set API queries are scoped to the signed-in
user, and composite database foreign keys prevent cards and stars from referencing
another user's records. Do not run schema-changing commands against production
as part of local development.
