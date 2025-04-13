import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Game API routes
  app.get('/api/scores', async (req, res) => {
    try {
      const scores = await storage.getTopScores(10);
      res.json(scores);
    } catch (error) {
      console.error('Error fetching scores:', error);
      res.status(500).json({ error: 'Failed to fetch scores' });
    }
  });

  app.post('/api/scores', async (req, res) => {
    try {
      const { userId, score } = req.body;
      if (!userId || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid score data' });
      }
      
      const timestamp = new Date().toISOString();
      const savedScore = await storage.saveScore({ userId, score, timestamp });
      res.json(savedScore);
    } catch (error) {
      console.error('Error saving score:', error);
      res.status(500).json({ error: 'Failed to save score' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
