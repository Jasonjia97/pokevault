import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import type { Pool } from "pg";
import connectPgSimple from "connect-pg-simple";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;
const PgSessionStore = connectPgSimple(session);

type PublicUser = {
  id: string;
  email: string;
};

type UserRecord = PublicUser & {
  password_hash: string;
};

function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email };
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

export function createApp(pool: Pool) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set before starting PokéVault.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(
    session({
      name: "pokevault.sid",
      store: new PgSessionStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: false,
        pruneSessionInterval: 15 * 60,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_TTL_MS,
      },
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in a little while." },
  });
  const auth = express.Router();
  auth.use(authLimiter);

  auth.post("/signup", async (req, res, next) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      res
        .status(400)
        .json({ error: "Choose a password between 8 and 72 bytes long." });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      const userId = randomUUID();
      const result = await pool.query<PublicUser>(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email`,
        [userId, email, passwordHash],
      );

      await regenerateSession(req);
      req.session.userId = result.rows[0].id;
      await saveSession(req);
      res.status(201).json({ user: publicUser(result.rows[0]) });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }
      next(error);
    }
  });

  auth.post("/login", async (req, res, next) => {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    try {
      const result = await pool.query<UserRecord>(
        `SELECT id, email, password_hash
         FROM users
         WHERE email = $1`,
        [email],
      );
      const user = result.rows[0];
      const passwordMatches = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

      if (!user || !passwordMatches) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      await regenerateSession(req);
      req.session.userId = user.id;
      await saveSession(req);
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  auth.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      res.clearCookie("pokevault.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.status(204).end();
    });
  });

  auth.get("/me", async (req, res, next) => {
    if (!req.session.userId) {
      res.json({ user: null });
      return;
    }
    try {
      const result = await pool.query<PublicUser>(
        "SELECT id, email FROM users WHERE id = $1",
        [req.session.userId],
      );
      if (!result.rows[0]) {
        req.session.destroy(() => {});
        res.json({ user: null });
        return;
      }
      res.json({ user: publicUser(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", auth);

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      console.error(
        "Request failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Something went wrong. Please try again." });
    },
  );

  return app;
}
