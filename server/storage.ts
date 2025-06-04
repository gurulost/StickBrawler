    // Resolved Conflict 1: Took import from e144449 (includes gameScores)
    import { users, gameScores, type User, type InsertUser, type GameScore, type InsertGameScore } from "@shared/schema";

    // modify the interface with any CRUD methods
    // you might need

    // Kept the IStorage interface from HEAD (which was based on e144449 resolution)
    // as it's identical in methods to what c899993 offered for the interface.
    export interface IStorage {
      getUser(id: number): Promise<User | undefined>;
      getUserByUsername(username: string): Promise<User | undefined>;
      createUser(user: InsertUser): Promise<User>;
      saveScore(score: InsertGameScore): Promise<GameScore>;
      getTopScores(limit?: number): Promise<GameScore[]>;
      getUserScores(userId: number): Promise<GameScore[]>;
      updateUserHighScore(userId: number, score: number): Promise<void>;
    }

    // The MemStorage class below is the one we want, based on the e144449 resolution.
    // The conflicting block from c899993 has been removed.
    export class MemStorage implements IStorage {
      private users: Map<number, User>;
      private scores: Map<number, GameScore>; // Using Map for scores
      private currentUserId: number; // Separate ID for users
      private currentScoreId: number; // Separate ID for scores

      constructor() {
        this.users = new Map();
        this.scores = new Map(); // Initialize scores as a Map
        this.currentUserId = 1;
        this.currentScoreId = 1;
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
        const id = this.currentUserId++;
        const user: User = { ...insertUser, id, highScore: 0 }; 
        this.users.set(id, user);
        return user;
      }

      async saveScore(scoreData: InsertGameScore): Promise<GameScore> {
        const id = this.currentScoreId++;
        const score: GameScore = { 
          id, 
          userId: scoreData.userId ?? null, // Handle potential undefined/null from input
          score: scoreData.score, 
          timestamp: scoreData.timestamp 
        };
        this.scores.set(id, score);

        if (scoreData.userId != null) { // Check for null or undefined explicitly
          await this.updateUserHighScore(scoreData.userId, scoreData.score);
        }

        return score;
      }

      async getTopScores(limit: number = 10): Promise<GameScore[]> { 
        const allScores = Array.from(this.scores.values()); 
        return allScores
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }

      async getUserScores(userId: number): Promise<GameScore[]> {
        return Array.from(this.scores.values())
          .filter(score => score.userId === userId)
          .sort((a, b) => b.score - a.score);
      }

      async updateUserHighScore(userId: number, newScore: number): Promise<void> {
        const user = this.users.get(userId);
        if (user && newScore > (user.highScore ?? 0)) { // Safe comparison for highScore
          const updatedUser: User = { ...user, highScore: newScore };
          this.users.set(userId, updatedUser);
        }
      }
    }

    export const storage = new MemStorage();