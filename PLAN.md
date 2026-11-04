# PokéVault — Project Plan

## 1. Pitch
I am building **PokéVault**, a web app for keeping track of my Pokémon card collection, because I want one place to record which cards I own, what I paid, which sets they belong to, and which cards I hope to buy. I will use it when I buy or evaluate a card, approximately once or twice a week. Other collectors will be able to create their own accounts and manage their own collections.

## 2. Features (in build order)
The numbered user stories below will each be implemented on a separate feature branch and merged by pull request after the plan PR.

1. **Sign up and login.** As a collector, I want to register with an email and password, sign in, and sign out, so that my collection is available only to me. Each account will have a record in `users`. Passwords must be securely hashed.
2. **Relational data model and sets.** As a collector, I want to create a named Pokémon card set/category, so that I can organize my cards by set. The database will include `users`, `sets`, `cards`, and `stars`, with foreign keys connecting them. A user can only view and edit their own sets and cards.
3. **Card CRUD.** As a collector, I want to add a card, see my cards in a list, open a card detail page, edit its details, and delete it after confirming, so that my inventory remains accurate. A card has a name, card number, set, condition, purchase price, acquisition date, and optional note.
4. **Validation.** As a collector, I want friendly error messages when I omit a required field or enter an invalid price, so that I can correct mistakes before saving. Card name and set are required; price cannot be negative.
5. **Stars.** As a collector, I want to star and unstar cards and view only starred cards, so that I can quickly find my favorites. Stars must be stored in one shared `stars` junction table with a unique user/card combination.
6. **Find things.** As a collector, I want to search by card name, filter by set, and sort by newest or highest purchase price, so that I can find specific cards quickly.
7. **Dashboard.** As a collector, I want to see an owned-card count, total amount spent, and starred-card count, plus a chart of owned cards by set, so that I understand my collection at a glance. Wishlist cards are excluded from owned/spending totals.
8. **Custom feature — Wishlist.** As a collector, I want to mark a card as `wishlist` and use a separate Wishlist view, so that I can keep prospective purchases apart from cards I own.
9. **Custom feature — CSV export.** As a collector, I want to export only my own cards to a CSV file, so that I can keep a backup or use Excel. The export contains card name, card number, set, condition, purchase price, acquisition date, status, and notes.
10. **Custom feature — Dark mode.** As a collector, I want a light/dark theme toggle that persists across page refreshes, so that I can comfortably use the site at night.

## 3. Database
Use PostgreSQL. Tables and column types:

**users**
- `id`: UUID, primary key
- `email`: text, unique, required
- `password_hash`: text, required (never store plaintext passwords)
- `created_at`: timestamp, required

**sets**
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to `users.id`, required
- `name`: text, required
- `created_at`: timestamp, required
- Unique (`user_id`, `name`)

**cards**
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to `users.id`, required
- `set_id`: UUID, foreign key to `sets.id`, required
- `name`: text, required
- `card_number`: text, optional
- `condition`: text, optional
- `purchase_price`: decimal(10,2), default 0, nonnegative
- `acquired_date`: date, optional
- `notes`: text, optional
- `status`: text (`owned` or `wishlist`), default `owned`
- `created_at`: timestamp, required

**stars**
- `id`: UUID, primary key
- `user_id`: UUID, foreign key to `users.id`, required
- `card_id`: UUID, foreign key to `cards.id`, required
- `created_at`: timestamp, required
- Unique (`user_id`, `card_id`)

Relationships: One user has many sets and cards. One set has many cards. A user has many stars, and a card can be referenced in stars; `stars` is the required user-to-card junction table. All card, set, and star queries must be scoped to the logged-in user, including direct detail-page requests. A card may only reference a set owned by the same user. Deleting a card should also delete its stars.

## 4. Tests
1. **Data isolation:** Given two registered users, Alice and Bob, and a card saved by Alice, when Bob signs in and requests his collection and Alice's card detail endpoint, then he sees no Alice card in his collection and receives a not-found or forbidden response for Alice's card.
2. **Dashboard calculation:** Given one user with two owned cards purchased for $20 and $30 and one wishlist card listed at $100, when the dashboard statistics are calculated, then the owned-card count is 2 and total amount spent is exactly $50 (not $150).

Use an automated test framework such as Vitest with Supertest for API tests. For each test, capture screenshots of a deliberately failing run (red) and a passing run after reverting the deliberate bug (green). Explain the test and a realistic change that would break it in the corresponding PR description.

## 5. Technologies
- **Coding agent:** Replit Agent, because it can scaffold the project and implement scoped changes inside the Replit editor.
- **Frontend:** React, TypeScript, and Tailwind CSS, because they support a responsive component-based interface.
- **Backend:** Node.js and Express, because API routes can securely validate authenticated users and access PostgreSQL.
- **Database:** Replit PostgreSQL, because persistent relational tables and foreign keys match the assignment.
- **Database access:** Drizzle ORM (if compatible with the generated project), because typed queries and migrations reduce schema mistakes.
- **Authentication:** In-app email/password registration with hashed passwords, persistent server-side sessions, and secure HTTP-only cookies, because the class requires signup/login and private user data.
- **Tests:** Vitest and Supertest, because they can test authentication isolation and dashboard calculations automatically.
- **Hosting:** Replit Publishing with a server-capable deployment, because it can host the UI, API, and production database.
- **Version control:** GitHub with one issue, branch, prompt log, and merged pull request for each feature, because the assignment explicitly requires that workflow.
- **External services:** None needed for the first version; users enter their own card information.

## 6. Design
Use a clean card-collector dashboard with a navy/charcoal base, subtle violet accents, rounded cards, and mobile-friendly layouts. Card entries display name, set, condition, price, and star status. Navigation: Collection, Wishlist, Starred, Dashboard. Forms should use readable labels and clear error messages. Visual inspiration: Notion for simple organization and a modern collection-tracker layout for card grids. Dark mode is a separate custom feature, not a prerequisite for the base design.

## 7. Risks and Cuts
The biggest risks are reliable email/password sessions, authorization on every card and set endpoint, and making the deployed database work separately from development. I will test privacy with two accounts before moving on. If time is short, I will simplify styling first and keep charts basic (a bar chart of cards by set). I will not remove sign up/login, private data, the four-table schema, CRUD, search/sort, stars, dashboard, three custom features, or the two required tests, because they are graded. CSV export will be a simple file download without a complex import system; dark mode will use a straightforward theme toggle.

<!-- After all features have been shipped, append Section 8: Plan vs. Reality.
Do not edit Sections 1–7 to hide changes to the original plan.
Suggested table columns: Planned feature | Shipped / Changed / Cut | Status (Done/Backlogged) | Learning / Why.
-->
