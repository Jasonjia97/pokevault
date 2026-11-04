# PokéVault on Replit

## Current scope

The app includes email/password signup, login, logout, persistent PostgreSQL
sessions, and Feature 2 set creation and listing. Cards and stars currently
exist only as relational database tables; card CRUD, starring, search, dashboard,
wishlist, export, and dark mode are not implemented.

## Development

- `DATABASE_URL` and `SESSION_SECRET` must be available in the environment.
- Run `npm run db:migrate` to apply the SQL migrations to the development database.
- Run `npm run dev` to start the preview workflow.
- Run `npm test`, `npm run typecheck`, and `npm run build` for validation.

The preview uses port 5000; Vite proxies `/api` requests to Express on port 3001.
Every set API query is scoped to the signed-in user. Database composite foreign
keys also prevent cards and stars from referencing another user's records.
