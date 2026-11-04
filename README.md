# PokéVault

PokéVault is a private home for a Pokémon card collection. The current
`feature/authentication` branch contains Feature 1 only: account signup, login,
logout, password hashing, and persistent sessions. Collection features are not
part of this initial release.

## Run locally

1. Make sure `DATABASE_URL` points to a PostgreSQL database and set a strong,
   private `SESSION_SECRET` in the environment.
2. Install dependencies with `npm install`.
3. Create the authentication tables with `npm run db:migrate`.
4. Start the app with `npm run dev` and open the Replit preview.

The browser app runs on port 5000; its API runs on port 3001 and is reached
through the Vite `/api` proxy. For a production build, use `npm run build` and
`npm start` with `NODE_ENV=production` and `PORT=5000`.

## Authentication checks

- Run `npm test` to exercise signup, hashed password storage, session persistence,
  login, logout, duplicate-email handling, and input validation against
  PostgreSQL.
- Run `npm run typecheck` for TypeScript checks.

New accounts require a valid email and a password of at least 8 characters.
Passwords are stored as bcrypt hashes. Sessions are stored in PostgreSQL, with
an HTTP-only, same-site cookie that expires after seven days.