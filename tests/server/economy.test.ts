import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { registerRoutes } from "../../server/routes";
import { storage } from "../../server/storage";

async function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);
  return app;
}

test("economy API upserts and validates snapshots", { concurrency: 1 }, async () => {
  await storage.reset();
  const app = await createTestApp();
  const profileId = "eco_test_profile";

  const payload = {
    profileId,
    coins: 250,
    lifetimeCoins: 500,
    unlocks: {
      colorThemes: ["blue", "red"],
      figureStyles: ["normal"],
      accessories: ["none"],
      animationStyles: ["normal"],
    },
    lastCoinEvent: {
      direction: "credit" as const,
      amount: 40,
      reason: "round_win_ko",
      timestamp: new Date().toISOString(),
    },
  };

  await request(app).put("/api/economy").send(payload).expect(202);

  const fetched = await request(app).get(`/api/economy/${profileId}`).expect(200);
  assert.equal(fetched.body.coins, 250);
  assert.equal(fetched.body.lifetimeCoins, 500);
  assert.equal(fetched.body.unlocks.colorThemes.length, 2);

  await request(app)
    .put("/api/economy")
    .send({ ...payload, coins: 1111, lifetimeCoins: 2222 })
    .expect(202);

  const updated = await request(app).get(`/api/economy/${profileId}`).expect(200);
  assert.equal(updated.body.coins, 1111);
  assert.equal(updated.body.lifetimeCoins, 2222);

  await request(app)
    .put("/api/economy")
    .send({ profileId: "bad", coins: -5, lifetimeCoins: -10, unlocks: {} })
    .expect(422);
});
