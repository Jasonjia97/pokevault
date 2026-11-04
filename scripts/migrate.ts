import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const migration = await readFile(
    path.resolve(process.cwd(), "migrations/0001_auth.sql"),
    "utf8",
  );
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(migration);
    await client.query("COMMIT");
    console.log("Authentication database migration applied.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error(
    "Database migration failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
