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
const CARD_SELECT = `
  SELECT c.id, c.set_id, s.name AS set_name, c.name, c.card_number,
         c.condition, c.purchase_price,
         TO_CHAR(c.acquired_date, 'YYYY-MM-DD') AS acquired_date,
         c.notes, c.created_at,
         EXISTS (
           SELECT 1 FROM stars st
           WHERE st.card_id = c.id AND st.user_id = c.user_id
         ) AS is_starred
  FROM cards c
  JOIN sets s ON s.id = c.set_id AND s.user_id = c.user_id
`;

type CardPayload = {
  setId: string;
  name: string;
  cardNumber: string | null;
  condition: string | null;
  purchasePrice: string;
  acquiredDate: string | null;
  notes: string | null;
};

type CardSort = "added_desc" | "price_desc" | "price_asc" | "date_desc" | "date_asc";

const CARD_SORT_ORDERS: Record<CardSort, string> = {
  added_desc: "c.created_at DESC, c.name ASC",
  price_desc: "c.purchase_price DESC, c.name ASC",
  price_asc: "c.purchase_price ASC, c.name ASC",
  date_desc: "c.acquired_date DESC NULLS LAST, c.created_at DESC, c.name ASC",
  date_asc: "c.acquired_date ASC NULLS LAST, c.created_at DESC, c.name ASC",
};

function parseCardListFilters(query: Record<string, unknown>) {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const setId = typeof query.set_id === "string" ? query.set_id : "";
  const sort = typeof query.sort === "string" ? query.sort : "added_desc";

  if (search.length > 200) {
    return { error: "Search must be 200 characters or fewer." };
  }
  if (setId && !UUID_PATTERN.test(setId)) {
    return { error: "Choose a valid set filter." };
  }
  if (!Object.hasOwn(CARD_SORT_ORDERS, sort)) {
    return { error: "Choose a valid sort order." };
  }
  return {
    value: {
      search,
      setId: setId || null,
      sort: sort as CardSort,
    },
  };
}

function parseCardPayload(body: any): { value?: CardPayload; error?: string } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const setId = typeof body?.set_id === "string" ? body.set_id : "";
  if (!name) return { error: "Card name is required." };
  if (name.length > 200) return { error: "Card name must be 200 characters or fewer." };
  if (!UUID_PATTERN.test(setId)) return { error: "Choose a valid set." };

  const priceText =
    body?.purchase_price === undefined || body.purchase_price === ""
      ? "0"
      : String(body.purchase_price);
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(priceText)) {
    return { error: "Purchase price must be a nonnegative amount with up to two decimals." };
  }

  const acquiredDate =
    typeof body?.acquired_date === "string" && body.acquired_date
      ? body.acquired_date
      : null;
  if (acquiredDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(acquiredDate)) {
      return { error: "Enter a valid acquisition date." };
    }
    const parsedDate = new Date(`${acquiredDate}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== acquiredDate
    ) {
      return { error: "Enter a valid acquisition date." };
    }
  }

  const optionalText = (value: unknown, field: string, maxLength: number) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || value.length > maxLength) {
      throw new Error(`${field} must be ${maxLength} characters or fewer.`);
    }
    return value.trim() || null;
  };
  try {
    return {
      value: {
        setId,
        name,
        cardNumber: optionalText(body?.card_number, "Card number", 40),
        condition: optionalText(body?.condition, "Condition", 80),
        purchasePrice: priceText,
        acquiredDate,
        notes: optionalText(body?.notes, "Notes", 4000),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid card details." };
  }
}

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

  const cardsRouter = express.Router();
  cardsRouter.use(requireAuth);

  cardsRouter.get("/", async (req, res, next) => {
    const parsed = parseCardListFilters(req.query as Record<string, unknown>);
    if (!parsed.value) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const result = await pool.query(
        `${CARD_SELECT}
         WHERE c.user_id = $1
           AND ($2 = '' OR c.name ILIKE '%' || $2 || '%')
           AND ($3::uuid IS NULL OR c.set_id = $3)
         ORDER BY ${CARD_SORT_ORDERS[parsed.value.sort]}`,
        [req.session.userId, parsed.value.search, parsed.value.setId],
      );
      res.json({ cards: result.rows });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.get("/favorites", async (req, res, next) => {
    const parsed = parseCardListFilters(req.query as Record<string, unknown>);
    if (!parsed.value) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const orderBy = parsed.value.sort === "added_desc"
      ? "st.created_at DESC, c.name ASC"
      : CARD_SORT_ORDERS[parsed.value.sort];
    try {
      const result = await pool.query(
        `${CARD_SELECT}
         JOIN stars st ON st.card_id = c.id AND st.user_id = c.user_id
         WHERE c.user_id = $1 AND st.user_id = $1
           AND ($2 = '' OR c.name ILIKE '%' || $2 || '%')
           AND ($3::uuid IS NULL OR c.set_id = $3)
         ORDER BY ${orderBy}`,
        [req.session.userId, parsed.value.search, parsed.value.setId],
      );
      res.json({ cards: result.rows });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.post("/:id/star", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Card not found." });
      return;
    }
    try {
      const ownedCard = await pool.query(
        "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
        [req.params.id, req.session.userId],
      );
      if (!ownedCard.rowCount) {
        res.status(404).json({ error: "Card not found." });
        return;
      }
      await pool.query(
        `INSERT INTO stars (id, user_id, card_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, card_id) DO NOTHING`,
        [randomUUID(), req.session.userId, req.params.id],
      );
      res.json({ starred: true });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.delete("/:id/star", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Card not found." });
      return;
    }
    try {
      const ownedCard = await pool.query(
        "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
        [req.params.id, req.session.userId],
      );
      if (!ownedCard.rowCount) {
        res.status(404).json({ error: "Card not found." });
        return;
      }
      await pool.query(
        "DELETE FROM stars WHERE user_id = $1 AND card_id = $2",
        [req.session.userId, req.params.id],
      );
      res.json({ starred: false });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.post("/", async (req, res, next) => {
    const parsed = parseCardPayload(req.body);
    if (!parsed.value) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const card = parsed.value;
    try {
      const ownedSet = await pool.query(
        "SELECT id FROM sets WHERE id = $1 AND user_id = $2",
        [card.setId, req.session.userId],
      );
      if (!ownedSet.rowCount) {
        res.status(404).json({ error: "Set not found." });
        return;
      }
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO cards
           (id, user_id, set_id, name, card_number, condition,
            purchase_price, acquired_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          randomUUID(),
          req.session.userId,
          card.setId,
          card.name,
          card.cardNumber,
          card.condition,
          card.purchasePrice,
          card.acquiredDate,
          card.notes,
        ],
      );
      const result = await pool.query(
        `${CARD_SELECT} WHERE c.id = $1 AND c.user_id = $2`,
        [inserted.rows[0].id, req.session.userId],
      );
      res.status(201).json({ card: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.get("/:id", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Card not found." });
      return;
    }
    try {
      const result = await pool.query(
        `${CARD_SELECT} WHERE c.id = $1 AND c.user_id = $2`,
        [req.params.id, req.session.userId],
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: "Card not found." });
        return;
      }
      res.json({ card: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.put("/:id", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Card not found." });
      return;
    }
    const parsed = parseCardPayload(req.body);
    if (!parsed.value) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const card = parsed.value;
    try {
      const ownedCard = await pool.query(
        "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
        [req.params.id, req.session.userId],
      );
      if (!ownedCard.rowCount) {
        res.status(404).json({ error: "Card not found." });
        return;
      }
      const ownedSet = await pool.query(
        "SELECT id FROM sets WHERE id = $1 AND user_id = $2",
        [card.setId, req.session.userId],
      );
      if (!ownedSet.rowCount) {
        res.status(404).json({ error: "Set not found." });
        return;
      }
      await pool.query(
        `UPDATE cards
         SET set_id = $1, name = $2, card_number = $3, condition = $4,
             purchase_price = $5, acquired_date = $6, notes = $7
         WHERE id = $8 AND user_id = $9`,
        [
          card.setId,
          card.name,
          card.cardNumber,
          card.condition,
          card.purchasePrice,
          card.acquiredDate,
          card.notes,
          req.params.id,
          req.session.userId,
        ],
      );
      const result = await pool.query(
        `${CARD_SELECT} WHERE c.id = $1 AND c.user_id = $2`,
        [req.params.id, req.session.userId],
      );
      res.json({ card: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  cardsRouter.delete("/:id", async (req, res, next) => {
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Card not found." });
      return;
    }
    try {
      const result = await pool.query(
        "DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.session.userId],
      );
      if (!result.rowCount) {
        res.status(404).json({ error: "Card not found." });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/sets", setsRouter);
  app.use("/api/cards", cardsRouter);
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
