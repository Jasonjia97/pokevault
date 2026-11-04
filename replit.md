# PokéVault on Replit

## Current scope

The `feature/authentication` branch implements only account signup, login,
logout, password hashing, and persistent PostgreSQL-backed sessions. The
signed-in page is an empty starting point; collection management and the
remaining features in `PLAN.md` have not been built.

## Run and verify

- Set `DATABASE_URL` and a private `SESSION_SECRET` in Replit Secrets.
- Run `npm run db:migrate` once to create the `users` and `user_sessions`
  tables in the development database.
- Start the app with `npm run dev` (Vite preview on port 5000; API on port 3001).
- Run `npm test` and `npm run typecheck` to verify authentication and types.
- For a production build, run `npm run build`, then `NODE_ENV=production
  PORT=5000 npm start`.

Do not run schema-changing commands against production as part of local
development. This branch has not been deployed.
