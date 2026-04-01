

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../models/index";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌  DATABASE_URL is not set.\n" +
    "    Add it to your .env file:\n" +
    "    DATABASE_URL=postgresql://user:password@localhost:5432/vi_slides"
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


export const db = drizzle(pool, { schema });
