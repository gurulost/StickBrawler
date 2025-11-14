import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .or(z.string().startsWith("postgres://"))
    .or(z.string().startsWith("postgresql://"))
    .optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default("dev-secret-change-in-production-min-32-chars-long"),
  ENABLE_ONLINE_MULTIPLAYER: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  ONLINE_WS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("5001"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  SESSION_SECRET: process.env.SESSION_SECRET,
  ENABLE_ONLINE_MULTIPLAYER: process.env.ENABLE_ONLINE_MULTIPLAYER ?? "false",
  ONLINE_WS_PORT: process.env.ONLINE_WS_PORT ?? "5001",
});

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env file.");
}

export const env = parsed.data;
