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
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV ?? "development",
});

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env file.");
}

export const env = parsed.data;
