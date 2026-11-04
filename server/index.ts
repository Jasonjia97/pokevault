import path from "node:path";
import express from "express";
import { Pool } from "pg";
import { createApp } from "./app";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to start PokéVault.");
}

const pool = new Pool({ connectionString });
const app = createApp(pool);
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? (isProduction ? 5000 : 3001));

if (isProduction) {
  const clientDirectory = path.resolve(process.cwd(), "dist/client");
  app.use(express.static(clientDirectory));
  app.get("*splat", (_req, res) => {
    res.sendFile(path.join(clientDirectory, "index.html"));
  });
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`PokéVault API listening on port ${port}.`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
