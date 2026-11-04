# PokéVault

PokéVault is a private Pokémon card collection tracker. Each account manages
only its own sets and cards.

## Features

- Email/password signup, login, and logout with bcrypt-hashed passwords and
  PostgreSQL-backed sessions.
- Create and manage named Pokémon sets and cards.
- Card validation, case-insensitive name search, set filtering, and sorting by
  purchase price or acquisition date.
- Star and unstar cards, with a Favorites page.
- A dashboard for owned-card count, owned-card spending, starred-card count,
  and owned cards by set.
- A Wishlist page, with the option to move a card to owned status. Wishlist
  cards are excluded from owned totals and set charts.
- Download a user-scoped CSV of owned and wishlist cards.
- Persistent Light/Dark theme preference; dark is the default.

## Live app

Published URL: <https://pokevault-jsnjia9797.replit.app/>

The deployment is marked public with a successful build. At the time of this
documentation update, opening the root URL had returned `Cannot GET /`; this
documentation change does not include or publish an application-code fix.

## Technologies

- React and TypeScript, built and served with Vite; interface styling uses CSS.
- Node.js and Express for the server and API.
- PostgreSQL through `pg` and parameterized SQL queries.
- `express-session` with `connect-pg-simple` for persistent sessions.
- `bcryptjs` for password hashing.
- Vitest and Supertest for automated tests.
- Replit Publishing for hosting.

## Setup

Use Node.js 24 (the configured Replit runtime). Configure `DATABASE_URL` and
`SESSION_SECRET` in the environment; do not commit either value. Then run:

```sh
npm install
npm run db:migrate
npm run dev
```

The Vite preview runs on port 5000 and sends `/api` requests to Express on port
3001. The SQL migrations are in `migrations/`.

For a production build and local production run:

```sh
npm run build
NODE_ENV=production PORT=5000 npm start
```

## Tests and checks

```sh
npm test
npm run typecheck
npm run build
```

The Vitest/Supertest suite covers authentication and session handling,
user-owned data isolation, set/card operations, validation, favorites,
search/sorting, dashboard totals, wishlist behavior, and CSV export.
