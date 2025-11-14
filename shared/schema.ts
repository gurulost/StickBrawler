import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { LoadoutSyncEnvelope } from "./customization";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  highScore: integer("high_score").default(0),
});

export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  score: integer("score").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const economySnapshots = pgTable("economy_snapshots", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  coins: integer("coins").notNull().default(0),
  lifetimeCoins: integer("lifetime_coins").notNull().default(0),
  unlocks: jsonb("unlocks")
    .$type<{
      colorThemes: string[];
      figureStyles: string[];
      accessories: string[];
      animationStyles: string[];
    }>()
    .notNull(),
  lastCoinEvent: jsonb("last_coin_event")
    .$type<
      | {
          direction: "credit" | "debit";
          amount: number;
          reason: string;
          timestamp: string;
          metadata?: Record<string, unknown>;
        }
      | null
    >()
    .default(null),
  loadouts: jsonb("loadouts")
    .$type<LoadoutSyncEnvelope | null>()
    .default(null),
  updatedAt: text("updated_at").notNull(),
});

export const hitTelemetry = pgTable("hit_telemetry", {
  id: serial("id").primaryKey(),
  slot: text("slot").notNull(),
  timestamp: integer("timestamp").notNull(),
  comboCount: integer("combo_count").notNull().default(0),
  data: jsonb("data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertScoreSchema = createInsertSchema(gameScores).pick({
  userId: true,
  score: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = z.infer<typeof insertScoreSchema>;
export type EconomySnapshot = typeof economySnapshots.$inferSelect;
export type InsertEconomySnapshot = typeof economySnapshots.$inferInsert;
