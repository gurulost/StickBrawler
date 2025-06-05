import { users, type User, type InsertUser, type GameScore, type InsertGameScore } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTopScores(limit: number): Promise<GameScore[]>;
  saveScore(score: InsertGameScore): Promise<GameScore>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private scores: GameScore[];
  currentId: number;

  constructor() {
    this.users = new Map();
    this.scores = [];
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, highScore: 0 };
    this.users.set(id, user);
    return user;
  }

  async getTopScores(limit: number): Promise<GameScore[]> {
    return this.scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async saveScore(score: InsertGameScore): Promise<GameScore> {
    const newScore: GameScore = {
      id: this.scores.length + 1,
      userId: score.userId ?? null,
      score: score.score,
      timestamp: score.timestamp,
    };
    this.scores.push(newScore);

    if (newScore.userId !== null) {
      const user = await this.getUser(newScore.userId);
      if (user && (user.highScore ?? 0) < newScore.score) {
        user.highScore = newScore.score;
      }
    }

    return newScore;
  }
}

export const storage = new MemStorage();
