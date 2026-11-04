import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const migrationDirectory = path.resolve(process.cwd(), "migrations");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort();
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    for (const file of migrationFiles) {
      const sql = await readFile(path.join(migrationDirectory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`Applied ${file}.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
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
