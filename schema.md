# PokéVault database schema

This document describes the PostgreSQL development schema after migrations
`0001_auth.sql` and `0002_database_sets.sql`.

## `users`

Existing authentication table; it is retained and is not dropped or recreated
when already present.

| Column | PostgreSQL type | Null | Default | Key / rule |
|---|---|---:|---|---|
| `id` | `UUID` | No | — | Primary key |
| `email` | `TEXT` | No | — | Unique |
| `password_hash` | `TEXT` | No | — | Stores the bcrypt hash, never the password |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account creation time |

The existing database uses `TIMESTAMPTZ` for `users.created_at`. The original
plan calls this `timestamp`; the existing authentication schema is preserved.

## `user_sessions`

Persistent Express session storage used by authentication. It is not one of the
four product tables in `PLAN.md`, but it is part of the existing database and
must remain for login sessions.

| Column | PostgreSQL type | Null | Default | Key / rule |
|---|---|---:|---|---|
| `sid` | `VARCHAR` | No | — | Primary key |
| `sess` | `JSON` | No | — | Session payload, including the signed-in user ID |
| `expire` | `TIMESTAMP(6)` | No | — | Session expiry |

There is an index on `expire` for session cleanup. This table has no foreign key
to `users`; the session payload is managed by `express-session`.

## `sets`

| Column | PostgreSQL type | Null | Default | Key / rule |
|---|---|---:|---|---|
| `id` | `UUID` | No | — | Primary key |
| `user_id` | `UUID` | No | — | Foreign key to `users.id`, `ON DELETE CASCADE` |
| `name` | `TEXT` | No | — | Unique per user with `user_id` |
| `created_at` | `TIMESTAMP` | No | `NOW()` | Set creation time |

Additional constraints:

- `UNIQUE (user_id, name)` prevents duplicate set names for one user.
- `UNIQUE (id, user_id)` is the referenced key for card ownership validation.

## `cards`

The relational table is created now, but card CRUD is not part of Feature 2.

| Column | PostgreSQL type | Null | Default | Key / rule |
|---|---|---:|---|---|
| `id` | `UUID` | No | — | Primary key |
| `user_id` | `UUID` | No | — | Foreign key to `users.id`, `ON DELETE CASCADE` |
| `set_id` | `UUID` | No | — | Part of the composite set-owner foreign key |
| `name` | `TEXT` | No | — | Card name |
| `card_number` | `TEXT` | Yes | — | Optional card number |
| `condition` | `TEXT` | Yes | — | Optional condition |
| `purchase_price` | `DECIMAL(10,2)` | No | `0` | Check constraint requires a nonnegative value |
| `acquired_date` | `DATE` | Yes | — | Optional acquisition date |
| `notes` | `TEXT` | Yes | — | Optional note |
| `status` | `TEXT` | No | `'owned'` | Check constraint permits only `owned` or `wishlist` |
| `created_at` | `TIMESTAMP` | No | `NOW()` | Card creation time |

Additional constraints:

- `FOREIGN KEY (set_id, user_id) REFERENCES sets (id, user_id) ON DELETE CASCADE`
  ensures a card can only reference a set belonging to its owner.
- `UNIQUE (id, user_id)` is the referenced key for star ownership validation.
- A card's user must also exist in `users`.

## `stars`

This shared user-to-card junction table stores each user's starred cards.

| Column | PostgreSQL type | Null | Default | Key / rule |
|---|---|---:|---|---|
| `id` | `UUID` | No | — | Primary key |
| `user_id` | `UUID` | No | — | Foreign key to `users.id`, `ON DELETE CASCADE` |
| `card_id` | `UUID` | No | — | Part of the composite card-owner foreign key |
| `created_at` | `TIMESTAMP` | No | `NOW()` | Star creation time |

Additional constraints:

- `UNIQUE (user_id, card_id)` prevents duplicate stars by the same user.
- `FOREIGN KEY (card_id, user_id) REFERENCES cards (id, user_id) ON DELETE
  CASCADE` prevents a user from starring another user's card and removes stars
  when a card is deleted.

## Relationships and access control

- One user can have many sets, cards, and stars.
- One set can have many cards, with the composite foreign key enforcing that
  the card and set have the same owner.
- `stars` is the user-to-card junction table; its composite foreign key enforces
  that the star's user owns the card.
- The sets API requires a signed-in session and filters list and detail queries
  by the session's `user_id`. A set owned by a different user is returned as
  not found.
- PostgreSQL row-level security is not enabled; access scoping is enforced by
  the application queries, with composite foreign keys protecting record
  relationships.
