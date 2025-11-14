import {
  users,
  gameScores,
  economySnapshots,
  hitTelemetry,
  type User,
  type InsertUser,
  type GameScore,
  type InsertGameScore,
  type EconomySnapshot,
  type InsertEconomySnapshot,
} from "@shared/schema";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";
import { env } from "./env";
import { getDb } from "./db";
import { log } from "./vite";

type StickDatabase = NeonHttpDatabase<typeof schema>;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveScore(score: InsertGameScore): Promise<GameScore>;
  getTopScores(limit?: number): Promise<GameScore[]>;
  getUserScores(userId: number): Promise<GameScore[]>;
  updateUserHighScore(userId: number, score: number): Promise<void>;
  saveEconomySnapshot(snapshot: InsertEconomySnapshot): Promise<EconomySnapshot>;
  getEconomySnapshot(profileId: string): Promise<EconomySnapshot | undefined>;
  saveTelemetryBatch(entries: Array<{ slot: string; timestamp: number; comboCount: number; data: any }>): Promise<void>;
  /**
   * Testing/maintenance helper to wipe transient data.
   */
  reset(): Promise<void>;
}

class DbStorage implements IStorage {
  constructor(private readonly db: StickDatabase) {}

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async saveScore(scoreData: InsertGameScore): Promise<GameScore> {
    const payload = {
      ...scoreData,
      userId: scoreData.userId ?? null,
    };

    const [score] = await this.db.insert(gameScores).values(payload).returning();

    if (payload.userId != null) {
      await this.updateUserHighScore(payload.userId, payload.score);
    }

    return score;
  }

  async getTopScores(limit = 10): Promise<GameScore[]> {
    return this.db
      .select()
      .from(gameScores)
      .orderBy(desc(gameScores.score), desc(gameScores.timestamp))
      .limit(limit);
  }

  async getUserScores(userId: number): Promise<GameScore[]> {
    return this.db
      .select()
      .from(gameScores)
      .where(eq(gameScores.userId, userId))
      .orderBy(desc(gameScores.score));
  }

  async updateUserHighScore(userId: number, newScore: number): Promise<void> {
    await this.db
      .update(users)
      .set({ highScore: newScore })
      .where(
        and(
          eq(users.id, userId),
          or(isNull(users.highScore), lt(users.highScore, newScore)),
        ),
      );
  }

  async reset(): Promise<void> {
    await this.db.delete(gameScores);
    await this.db.delete(economySnapshots);
    await this.db.delete(hitTelemetry);
    await this.db.update(users).set({ highScore: 0 });
  }

  async saveTelemetryBatch(entries: Array<{ slot: string; timestamp: number; comboCount: number; data: any }>): Promise<void> {
    if (entries.length === 0) return;
    
    const values = entries.map(entry => ({
      slot: entry.slot,
      timestamp: entry.timestamp,
      comboCount: entry.comboCount,
      data: entry.data,
      createdAt: new Date().toISOString(),
    }));

    await this.db.insert(hitTelemetry).values(values);
  }

  async saveEconomySnapshot(snapshot: InsertEconomySnapshot): Promise<EconomySnapshot> {
    const payload: InsertEconomySnapshot = {
      ...snapshot,
      userId: snapshot.userId ?? null,
      updatedAt: snapshot.updatedAt ?? new Date().toISOString(),
      lastCoinEvent: snapshot.lastCoinEvent ?? null,
      loadouts: snapshot.loadouts ?? null,
    };
    const [row] = await this.db
      .insert(economySnapshots)
      .values(payload)
      .onConflictDoUpdate({
        target: economySnapshots.profileId,
        set: {
          coins: payload.coins,
          lifetimeCoins: payload.lifetimeCoins,
          unlocks: payload.unlocks,
          lastCoinEvent: payload.lastCoinEvent,
          updatedAt: payload.updatedAt,
          userId: payload.userId,
          loadouts: payload.loadouts,
        },
      })
      .returning();
    return row;
  }

  async getEconomySnapshot(profileId: string): Promise<EconomySnapshot | undefined> {
    const [row] = await this.db
      .select()
      .from(economySnapshots)
      .where(eq(economySnapshots.profileId, profileId))
      .limit(1);
    return row;
  }
}

class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private scores = new Map<number, GameScore>();
  private economy = new Map<string, EconomySnapshot>();
  private currentUserId = 1;
  private currentScoreId = 1;
  private currentEconomyId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, highScore: 0 };
    this.users.set(id, user);
    return user;
  }

  async saveScore(scoreData: InsertGameScore): Promise<GameScore> {
    const id = this.currentScoreId++;
    const score: GameScore = {
      id,
      userId: scoreData.userId ?? null,
      score: scoreData.score,
      timestamp: scoreData.timestamp,
    };
    this.scores.set(id, score);

    if (scoreData.userId != null) {
      await this.updateUserHighScore(scoreData.userId, scoreData.score);
    }

    return score;
  }

  async getTopScores(limit = 10): Promise<GameScore[]> {
    return Array.from(this.scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async getUserScores(userId: number): Promise<GameScore[]> {
    return Array.from(this.scores.values())
      .filter((score) => score.userId === userId)
      .sort((a, b) => b.score - a.score);
  }

  async updateUserHighScore(userId: number, newScore: number): Promise<void> {
    const user = this.users.get(userId);
    if (user && newScore > (user.highScore ?? 0)) {
      const updatedUser: User = { ...user, highScore: newScore };
      this.users.set(userId, updatedUser);
    }
  }

  async reset(): Promise<void> {
    this.users.clear();
    this.scores.clear();
    this.economy.clear();
    this.currentUserId = 1;
    this.currentScoreId = 1;
    this.currentEconomyId = 1;
  }

  async saveEconomySnapshot(snapshot: InsertEconomySnapshot): Promise<EconomySnapshot> {
    const existing = this.economy.get(snapshot.profileId);
    const entry: EconomySnapshot = {
      id: existing?.id ?? this.currentEconomyId++,
      profileId: snapshot.profileId,
      userId: snapshot.userId ?? null,
      coins: snapshot.coins ?? 0,
      lifetimeCoins: snapshot.lifetimeCoins ?? 0,
      unlocks: snapshot.unlocks,
      lastCoinEvent: snapshot.lastCoinEvent ?? null,
      updatedAt: snapshot.updatedAt ?? new Date().toISOString(),
      loadouts: snapshot.loadouts ?? null,
    };
    this.economy.set(snapshot.profileId, entry);
    return entry;
  }

  async getEconomySnapshot(profileId: string): Promise<EconomySnapshot | undefined> {
    return this.economy.get(profileId);
  }

  async saveTelemetryBatch(_entries: Array<{ slot: string; timestamp: number; comboCount: number; data: any }>): Promise<void> {
    // In-memory storage doesn't persist telemetry
  }
}

function createStorage(): IStorage {
  if (env.DATABASE_URL) {
    try {
      return new DbStorage(getDb());
    } catch (error) {
      log(
        `Failed to connect to database, falling back to in-memory storage: ${(error as Error).message}`,
        "storage",
      );
    }
  } else {
    log(
      "DATABASE_URL not set, using in-memory storage. Scores will reset on restart.",
      "storage",
    );
  }

  return new MemStorage();
}

export const storage = createStorage();
