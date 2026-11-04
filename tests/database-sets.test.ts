import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../server/app";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the tests.");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required to run the tests.");
}

const pool = new Pool({ connectionString });
const app = createApp(pool);
const createdEmails: string[] = [];

afterAll(async () => {
  if (createdEmails.length) {
    await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
      createdEmails,
    ]);
  }
  await pool.end();
});

function cookieFrom(response: request.Response): string {
  const cookies = response.headers["set-cookie"];
  const firstCookie = Array.isArray(cookies) ? cookies[0] : cookies;
  if (!firstCookie) throw new Error("Signup did not set a session cookie.");
  return firstCookie.split(";")[0];
}

async function signUp(email: string) {
  createdEmails.push(email);
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email, password: "vault-password-2026" });
  expect(response.status).toBe(201);
  return { user: response.body.user as { id: string; email: string }, cookie: cookieFrom(response) };
}

describe("PokéVault authentication and set ownership", () => {
  it("keeps signup, password hashing, login, and logout working", async () => {
    const email = `auth-${randomUUID()}@example.test`;
    createdEmails.push(email);

    const signup = await request(app)
      .post("/api/auth/signup")
      .send({ email, password: "vault-password-2026" });
    expect(signup.status).toBe(201);
    const cookie = cookieFrom(signup);

    const storedUser = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email],
    );
    expect(storedUser.rows[0].password_hash).not.toBe("vault-password-2026");
    expect(storedUser.rows[0].password_hash).toMatch(/^\$2[aby]\$/);

    const sessionUser = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(sessionUser.body.user.email).toBe(email);

    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).body.user)
      .toBeNull();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "vault-password-2026" });
    expect(login.status).toBe(200);
    const loginCookie = cookieFrom(login);
    expect(
      (await request(app).get("/api/auth/me").set("Cookie", loginCookie)).body.user.email,
    ).toBe(email);
    await request(app).post("/api/auth/logout").set("Cookie", loginCookie).send({});
  });

  it("creates sets that remain visible after a fresh request", async () => {
    const email = `sets-${randomUUID()}@example.test`;
    const { cookie } = await signUp(email);

    const first = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Scarlet & Violet 151" });
    const second = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Surging Sparks" });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const refreshedSession = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(refreshedSession.body.user.email).toBe(email);
    const list = await request(app).get("/api/sets").set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.sets.map((set: { name: string }) => set.name)).toEqual(
      expect.arrayContaining(["Scarlet & Violet 151", "Surging Sparks"]),
    );
    expect(list.body.sets).toHaveLength(2);

    const detail = await request(app)
      .get(`/api/sets/${first.body.set.id}`)
      .set("Cookie", cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.set.name).toBe("Scarlet & Violet 151");
    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
  });

  it("isolates set lists and direct set lookups by account", async () => {
    const alice = await signUp(`alice-${randomUUID()}@example.test`);
    const bob = await signUp(`bob-${randomUUID()}@example.test`);

    const aliceSet = await request(app)
      .post("/api/sets")
      .set("Cookie", alice.cookie)
      .send({ name: "Paldean Fates" });
    const bobsSameNamedSet = await request(app)
      .post("/api/sets")
      .set("Cookie", bob.cookie)
      .send({ name: "Paldean Fates" });
    expect(aliceSet.status).toBe(201);
    expect(bobsSameNamedSet.status).toBe(201);
    expect(aliceSet.body.set.id).not.toBe(bobsSameNamedSet.body.set.id);

    const bobsList = await request(app).get("/api/sets").set("Cookie", bob.cookie);
    expect(bobsList.body.sets).toHaveLength(1);
    expect(bobsList.body.sets[0].id).toBe(bobsSameNamedSet.body.set.id);

    const forbiddenDetail = await request(app)
      .get(`/api/sets/${aliceSet.body.set.id}`)
      .set("Cookie", bob.cookie);
    expect(forbiddenDetail.status).toBe(404);

    await request(app).post("/api/auth/logout").set("Cookie", alice.cookie).send({});
    await request(app).post("/api/auth/logout").set("Cookie", bob.cookie).send({});
  });

  it("requires authentication and enforces cross-owner data relationships", async () => {
    expect((await request(app).get("/api/sets")).status).toBe(401);
    expect(
      (await request(app).post("/api/sets").send({ name: "No account" })).status,
    ).toBe(401);

    const alice = await signUp(`owner-a-${randomUUID()}@example.test`);
    const bob = await signUp(`owner-b-${randomUUID()}@example.test`);
    const set = await request(app)
      .post("/api/sets")
      .set("Cookie", alice.cookie)
      .send({ name: "Test Set" });
    const cardId = randomUUID();

    await expect(
      pool.query(
        `INSERT INTO cards (id, user_id, set_id, name)
         VALUES ($1, $2, $3, $4)`,
        [cardId, bob.user.id, set.body.set.id, "Wrong owner"],
      ),
    ).rejects.toMatchObject({ code: "23503" });

    await pool.query(
      `INSERT INTO cards (id, user_id, set_id, name)
       VALUES ($1, $2, $3, $4)`,
      [cardId, alice.user.id, set.body.set.id, "Schema test card"],
    );
    const card = await pool.query(
      "SELECT purchase_price, status FROM cards WHERE id = $1",
      [cardId],
    );
    expect(card.rows[0]).toEqual({ purchase_price: "0.00", status: "owned" });

    await expect(
      pool.query(
        "INSERT INTO stars (id, user_id, card_id) VALUES ($1, $2, $3)",
        [randomUUID(), bob.user.id, cardId],
      ),
    ).rejects.toMatchObject({ code: "23503" });

    await pool.query(
      "INSERT INTO stars (id, user_id, card_id) VALUES ($1, $2, $3)",
      [randomUUID(), alice.user.id, cardId],
    );
    await pool.query("DELETE FROM cards WHERE id = $1", [cardId]);
    const remainingStars = await pool.query(
      "SELECT id FROM stars WHERE card_id = $1",
      [cardId],
    );
    expect(remainingStars.rows).toHaveLength(0);

    await request(app).post("/api/auth/logout").set("Cookie", alice.cookie).send({});
    await request(app).post("/api/auth/logout").set("Cookie", bob.cookie).send({});
  });

  it("validates set names and prevents duplicate names per user", async () => {
    const { cookie } = await signUp(`validation-${randomUUID()}@example.test`);
    const empty = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "   " });
    expect(empty.status).toBe(400);

    const first = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Crown Zenith" });
    const duplicate = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Crown Zenith" });
    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
  });

  it("creates, lists, views, edits, and deletes a card", async () => {
    const { cookie } = await signUp(`card-crud-${randomUUID()}@example.test`);
    const set = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Test Set" });
    const created = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({
        set_id: set.body.set.id,
        name: "Pikachu",
        card_number: "025",
        condition: "Near mint",
        purchase_price: "12.50",
        acquired_date: "2025-03-04",
        notes: "Holo",
      });

    expect(created.status).toBe(201);
    expect(created.body.card).toMatchObject({
      name: "Pikachu",
      set_name: "Test Set",
      card_number: "025",
      condition: "Near mint",
      purchase_price: "12.50",
      acquired_date: "2025-03-04",
      notes: "Holo",
    });
    const cardId = created.body.card.id as string;
    expect((await request(app).get("/api/cards").set("Cookie", cookie)).body.cards)
      .toHaveLength(1);
    expect(
      (await request(app).get(`/api/cards/${cardId}`).set("Cookie", cookie)).body.card.name,
    ).toBe("Pikachu");

    const updated = await request(app)
      .put(`/api/cards/${cardId}`)
      .set("Cookie", cookie)
      .send({ ...created.body.card, set_id: set.body.set.id, name: "Pikachu ex" });
    expect(updated.status).toBe(200);
    expect(updated.body.card.name).toBe("Pikachu ex");

    expect((await request(app).delete(`/api/cards/${cardId}`).set("Cookie", cookie)).status)
      .toBe(204);
    expect((await request(app).get(`/api/cards/${cardId}`).set("Cookie", cookie)).status)
      .toBe(404);
    expect((await request(app).get("/api/cards").set("Cookie", cookie)).body.cards)
      .toHaveLength(0);
    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
  });

  it("isolates card listing, details, edits, deletion, and set assignment by user", async () => {
    const alice = await signUp(`card-owner-${randomUUID()}@example.test`);
    const bob = await signUp(`card-visitor-${randomUUID()}@example.test`);
    const aliceSet = await request(app)
      .post("/api/sets")
      .set("Cookie", alice.cookie)
      .send({ name: "Alice Set" });
    const bobsSet = await request(app)
      .post("/api/sets")
      .set("Cookie", bob.cookie)
      .send({ name: "Bob Set" });
    const card = await request(app)
      .post("/api/cards")
      .set("Cookie", alice.cookie)
      .send({ set_id: aliceSet.body.set.id, name: "Private card" });
    expect(card.status).toBe(201);
    const cardId = card.body.card.id as string;

    const bobsCards = await request(app).get("/api/cards").set("Cookie", bob.cookie);
    expect(bobsCards.status).toBe(200);
    expect(bobsCards.body.cards).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cardId })]),
    );
    expect((await request(app).get(`/api/cards/${cardId}`).set("Cookie", bob.cookie)).status)
      .toBe(404);
    expect(
      (await request(app).put(`/api/cards/${cardId}`).set("Cookie", bob.cookie).send({
        set_id: bobsSet.body.set.id,
        name: "Stolen edit",
      })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/cards/${cardId}`).set("Cookie", bob.cookie)).status)
      .toBe(404);

    const foreignSetCard = await request(app)
      .post("/api/cards")
      .set("Cookie", bob.cookie)
      .send({ set_id: aliceSet.body.set.id, name: "Wrong set owner" });
    expect(foreignSetCard.status).toBe(404);
    expect((await request(app).get(`/api/cards/${cardId}`).set("Cookie", alice.cookie)).status)
      .toBe(200);
    expect((await request(app).get("/api/cards")).status).toBe(401);
    await request(app).post("/api/auth/logout").set("Cookie", alice.cookie).send({});
    await request(app).post("/api/auth/logout").set("Cookie", bob.cookie).send({});
  });

  it("rejects missing card names and negative purchase prices", async () => {
    const { cookie } = await signUp(`card-validation-${randomUUID()}@example.test`);
    const set = await request(app)
      .post("/api/sets")
      .set("Cookie", cookie)
      .send({ name: "Validation Set" });
    const missingName = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({ set_id: set.body.set.id, name: " " });
    const missingSet = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({ name: "Pikachu" });
    const negativePrice = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({ set_id: set.body.set.id, name: "Invalid price", purchase_price: "-1" });
    const extraPrecision = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({ set_id: set.body.set.id, name: "Invalid precision", purchase_price: "1.234" });

    const validCard = await request(app)
      .post("/api/cards")
      .set("Cookie", cookie)
      .send({ set_id: set.body.set.id, name: "Valid card", purchase_price: "1.25" });
    const invalidUpdate = await request(app)
      .put(`/api/cards/${validCard.body.card.id}`)
      .set("Cookie", cookie)
      .send({ set_id: set.body.set.id, name: "Valid card", purchase_price: "-0.01" });

    expect(missingName.status).toBe(400);
    expect(missingName.body.error).toBe("Card name is required.");
    expect(missingSet.status).toBe(400);
    expect(missingSet.body.error).toBe("Choose a valid set.");
    expect(negativePrice.status).toBe(400);
    expect(negativePrice.body.error).toBe(
      "Purchase price must be a nonnegative amount with up to two decimals.",
    );
    expect(extraPrecision.status).toBe(400);
    expect(invalidUpdate.status).toBe(400);
    await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
  });
});
