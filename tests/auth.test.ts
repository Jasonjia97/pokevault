import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../server/app";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run authentication tests.");
}
const pool = new Pool({ connectionString });
const app = createApp(pool);
const createdEmails: string[] = [];

beforeAll(() => {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required to run authentication tests.");
  }
});

afterAll(async () => {
  if (createdEmails.length > 0) {
    await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
      createdEmails,
    ]);
  }
  await pool.end();
});

describe("account authentication", () => {
  it("creates a password hash, persists login, and logs out", async () => {
    const email = `auth-${randomUUID()}@example.test`;
    const password = "correct-horse-42";
    createdEmails.push(email);
    const agent = request.agent(app);

    const signup = await agent
      .post("/api/auth/signup")
      .send({ email: ` ${email.toUpperCase()} `, password });
    expect(signup.status).toBe(201);
    expect(signup.body.user.email).toBe(email);
    expect(signup.body.user.password_hash).toBeUndefined();

    const storedUser = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email],
    );
    expect(storedUser.rows[0].password_hash).not.toBe(password);
    expect(storedUser.rows[0].password_hash).toMatch(/^\$2[aby]\$/);

    const sessionCheck = await agent.get("/api/auth/me");
    expect(sessionCheck.status).toBe(200);
    expect(sessionCheck.body.user.email).toBe(email);

    const logout = await agent.post("/api/auth/logout").send({});
    expect(logout.status).toBe(204);
    const signedOut = await agent.get("/api/auth/me");
    expect(signedOut.status).toBe(200);
    expect(signedOut.body.user).toBeNull();

    const login = await agent
      .post("/api/auth/login")
      .send({ email, password });
    expect(login.status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user.email).toBe(email);
    expect((await agent.post("/api/auth/logout").send({})).status).toBe(204);
  });

  it("rejects duplicate accounts and invalid credentials", async () => {
    const email = `duplicate-${randomUUID()}@example.test`;
    createdEmails.push(email);

    const agent = request.agent(app);
    expect(
      (
        await agent
          .post("/api/auth/signup")
          .send({ email, password: "correct-horse-42" })
      ).status,
    ).toBe(201);

    const duplicate = await agent
      .post("/api/auth/signup")
      .send({ email, password: "another-valid-password" });
    expect(duplicate.status).toBe(409);

    await agent.post("/api/auth/logout").send({});
    const invalidLogin = await agent
      .post("/api/auth/login")
      .send({ email, password: "not-the-password" });
    expect(invalidLogin.status).toBe(401);
  });

  it("keeps two collectors in separate authenticated sessions", async () => {
    const emailA = `collector-a-${randomUUID()}@example.test`;
    const emailB = `collector-b-${randomUUID()}@example.test`;
    createdEmails.push(emailA, emailB);
    const collectorA = request.agent(app);
    const collectorB = request.agent(app);

    expect(
      (
        await collectorA
          .post("/api/auth/signup")
          .send({ email: emailA, password: "first-valid-password" })
      ).status,
    ).toBe(201);
    expect(
      (
        await collectorB
          .post("/api/auth/signup")
          .send({ email: emailB, password: "second-valid-password" })
      ).status,
    ).toBe(201);

    expect((await collectorA.get("/api/auth/me")).body.user.email).toBe(emailA);
    expect((await collectorB.get("/api/auth/me")).body.user.email).toBe(emailB);

    await collectorA.post("/api/auth/logout").send({});
    expect((await collectorA.get("/api/auth/me")).body.user).toBeNull();
    expect((await collectorB.get("/api/auth/me")).body.user.email).toBe(emailB);
    await collectorB.post("/api/auth/logout").send({});
  });

  it("validates signup fields", async () => {
    const shortPassword = await request(app)
      .post("/api/auth/signup")
      .send({ email: "valid@example.test", password: "short" });
    expect(shortPassword.status).toBe(400);

    const invalidEmail = await request(app)
      .post("/api/auth/signup")
      .send({ email: "not-an-email", password: "valid-password" });
    expect(invalidEmail.status).toBe(400);
  });
});
