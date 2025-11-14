import { Router } from "express";
import { z } from "zod";
import { getOnlineSocketServer } from "./online/serverProvider";

const router = Router();

// Create a new online match
router.post("/create", (req, res) => {
  const schema = z.object({
    profileId: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { profileId } = parsed.data;
  
  const onlineServer = getOnlineSocketServer();
  if (!onlineServer) {
    return res.status(503).json({ error: "Online multiplayer not enabled" });
  }
  
  const coordinator = onlineServer.getCoordinator();
  const seed = Math.floor(Math.random() * 1000000);
  const descriptor = coordinator.createMatch(profileId, seed);

  res.json({ matchId: descriptor.id, descriptor });
});

// Health check endpoint
router.get("/health", (req, res) => {
  const onlineServer = getOnlineSocketServer();
  if (!onlineServer) {
    return res.json({
      websocketEnabled: false,
      websocketPort: 0,
      status: "stopped",
      activeMatches: 0,
      activePlayers: 0,
      connectedSockets: 0,
      uptimeMs: 0,
    });
  }
  
  const health = onlineServer.getMetrics();
  res.json(health);
});

export { router as onlineRouter };
