import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import type { Pool } from "pg";
import connectPgSimple from "connect-pg-simple";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PgSessionStore = connectPgSimple(session);

type PublicUser = {
  id: string;
  email: string;
};

type UserRecord = PublicUser & {
  password_hash: string;
};

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

function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email };
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

  const authRouter = express.Router();
  authRouter.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many attempts. Please try again in a little while." },
    }),
  );

  authRouter.post("/signup", async (req, res, next) => {
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
      const result = await pool.query<PublicUser>(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email`,
        [randomUUID(), email, passwordHash],
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

  authRouter.post("/login", async (req, res, next) => {
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
      const matches = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!user || !matches) {
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

  authRouter.post("/logout", (req, res, next) => {
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

  authRouter.get("/me", async (req, res, next) => {
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

  const requireAuth: express.RequestHandler = (req, res, next) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Sign in to view your Pokémon sets." });
      return;
    }
    next();
  };

  const setsRouter = express.Router();
  setsRouter.use(requireAuth);

  setsRouter.get("/", async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, created_at
         FROM sets
         WHERE user_id = $1
         ORDER BY created_at DESC, name ASC`,
        [req.session.userId],
      );
      res.json({ sets: result.rows });
    } catch (error) {
      next(error);
    }
  });

  setsRouter.post("/", async (req, res, next) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Enter a name for this set." });
      return;
    }
    try {
      const result = await pool.query(
        `INSERT INTO sets (id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING id, name, created_at`,
        [randomUUID(), req.session.userId, name],
      );
      res.status(201).json({ set: result.rows[0] });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        res.status(409).json({ error: "You already have a set with this name." });
        return;
      }
      next(error);
    }
  });

  setsRouter.get("/:id", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Set not found." });
      return;
    }
    try {
      const result = await pool.query(
        `SELECT id, name, created_at
         FROM sets
         WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.session.userId],
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: "Set not found." });
        return;
      }
      res.json({ set: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/sets", setsRouter);
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
