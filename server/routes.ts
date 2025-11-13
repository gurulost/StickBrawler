import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { hitTelemetrySchema, storeTelemetry } from "./telemetry";

const scoreSubmissionSchema = z.object({
  userId: z
    .number({ coerce: true })
    .int()
    .positive()
    .optional(),
  score: z.number({ coerce: true }).int().nonnegative(),
});

const scoreQuerySchema = z.object({
  limit: z
    .number({ coerce: true })
    .int()
    .min(1)
    .max(50)
    .default(10),
});

const coinLedgerEntrySchema = z.object({
  direction: z.enum(["credit", "debit"]),
  amount: z.number().int().nonnegative(),
  reason: z.string().min(1),
  timestamp: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

const economyUnlockSchema = z.object({
  colorThemes: z.array(z.string()).default([]),
  figureStyles: z.array(z.string()).default([]),
  accessories: z.array(z.string()).default([]),
  animationStyles: z.array(z.string()).default([]),
});

const economyPayloadSchema = z.object({
  profileId: z.string().min(6).max(64),
  userId: z
    .number({ coerce: true })
    .int()
    .positive()
    .optional(),
  coins: z.number().int().min(0).max(999999),
  lifetimeCoins: z.number().int().min(0),
  unlocks: economyUnlockSchema,
  lastCoinEvent: coinLedgerEntrySchema.optional(),
});

type AsyncHandler = (
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
) => Promise<unknown>;

const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req as any, res, next)).catch(next);
  };

export async function registerRoutes(app: Express): Promise<Server> {
  app.get(
    "/api/scores",
    asyncHandler(async (req, res) => {
      const parsed = scoreQuerySchema.safeParse({
        limit: req.query.limit,
      });

      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "Invalid query", details: parsed.error.flatten() });
      }

      const scores = await storage.getTopScores(parsed.data.limit);
      res.json(scores);
    }),
  );

  app.post(
    "/api/scores",
    asyncHandler(async (req, res) => {
      const parsed = scoreSubmissionSchema.safeParse(req.body);

      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: "Invalid score data", details: parsed.error.flatten() });
      }

      const { userId, score } = parsed.data;
      const timestamp = new Date().toISOString();

      const savedScore = await storage.saveScore({
        userId: userId ?? null,
        score,
        timestamp,
      });

      res.status(201).json(savedScore);
    }),
  );

  app.put(
    "/api/economy",
    asyncHandler(async (req, res) => {
      const parsed = economyPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(422)
          .json({ error: "Invalid economy payload", details: parsed.error.flatten() });
      }

      const snapshot = await storage.saveEconomySnapshot({
        profileId: parsed.data.profileId,
        userId: parsed.data.userId ?? null,
        coins: parsed.data.coins,
        lifetimeCoins: parsed.data.lifetimeCoins,
        unlocks: parsed.data.unlocks,
        lastCoinEvent: parsed.data.lastCoinEvent ?? null,
        updatedAt: new Date().toISOString(),
      });

      res.status(202).json(snapshot);
    }),
  );

  app.get(
    "/api/economy/:profileId",
    asyncHandler(async (req, res) => {
      const profileId = req.params.profileId;
      if (!profileId) {
        return res.status(400).json({ error: "Missing profileId in path" });
      }
      const snapshot = await storage.getEconomySnapshot(profileId);
      if (!snapshot) {
        return res.status(404).json({ error: "Economy snapshot not found" });
      }
      res.json(snapshot);
    }),
  );

  app.post(
    "/api/telemetry",
    asyncHandler(async (req, res) => {
      const payload = z
        .object({
          entries: z.array(hitTelemetrySchema),
        })
        .safeParse(req.body);
      if (!payload.success) {
        return res
          .status(422)
          .json({ error: "Invalid telemetry payload", details: payload.error.flatten() });
      }
      storeTelemetry(payload.data.entries);
      res.status(204).end();
    }),
  );

  const httpServer = createServer(app);
  return httpServer;
}
