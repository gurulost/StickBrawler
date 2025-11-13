import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";
import { env } from "./env";
import { log } from "./vite";

type StickBrawlerDatabase = NeonHttpDatabase<typeof schema>;

let dbSingleton: StickBrawlerDatabase | undefined;

export function getDb(): StickBrawlerDatabase {
  if (dbSingleton) {
    return dbSingleton;
  }

  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to initialize the database connection.",
    );
  }

  const client = neon(env.DATABASE_URL);
  dbSingleton = drizzle(client, {
    schema,
  });
  log("Database connection established", "db");
  return dbSingleton;
}
