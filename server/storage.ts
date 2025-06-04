    // Resolved Conflict 1: Took import from e144449 (includes gameScores)
    import { users, gameScores, type User, type InsertUser, type GameScore, type InsertGameScore } from "@shared/schema";

    // modify the interface with any CRUD methods
    // you might need

    // Resolved Conflict 2: Took interface from e144449 (more methods, optional limit)
    export interface IStorage {
      getUser(id: number): Promise<User | undefined>;
      getUserByUsername(username: string): Promise<User | undefined>;
      createUser(user: InsertUser): Promise<User>;
      saveScore(score: InsertGameScore): Promise<GameScore>;
      getTopScores(limit?: number): Promise<GameScore[]>;
      getUserScores(userId: number): Promise<GameScore[]>;
      updateUserHighScore(userId: number, score: number): Promise<void>;
    }

    export class MemStorage implements IStorage {
      // Resolved Conflict 3: Took class members and constructor from e144449
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
        // Resolved Conflict 4: Took id generation from e144449
        const id = this.currentUserId++;
        const user: User = { ...insertUser, id, highScore: 0 }; // highScore is initialized to 0 in both versions
        this.users.set(id, user);
        return user;
      }

      // Resolved Conflict 5: Took all score-related methods from e144449
      async saveScore(scoreData: InsertGameScore): Promise<GameScore> {
        const id = this.currentScoreId++;
        const score: GameScore = { 
          id, 
          // Assuming scoreData.userId can be undefined and schema expects number | null
          // Using ?? null for explicit handling of undefined/null.
          userId: scoreData.userId ?? null, 
          score: scoreData.score, 
          timestamp: scoreData.timestamp 
        };
        this.scores.set(id, score);

        // Update user's high score if this is better
        if (scoreData.userId != null) { // Check for null or undefined explicitly
          await this.updateUserHighScore(scoreData.userId, scoreData.score);
        }

        return score;
      }

      async getTopScores(limit: number = 10): Promise<GameScore[]> { // limit is optional with default from e144449
        const allScores = Array.from(this.scores.values()); // Converts Map values to array
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
        // Ensure highScore is treated as a number, defaulting to 0 if null/undefined for comparison
        if (user && newScore > (user.highScore ?? 0)) {
          const updatedUser = { ...user, highScore: newScore };
          this.users.set(userId, updatedUser);
        }
      }
    }

    export const storage = new MemStorage();