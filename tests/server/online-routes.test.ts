import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { registerRoutes } from "../../server/routes";

async function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = await registerRoutes(app);
  return { app, server };
}

test("online routes stay disabled when websocket runtime is not enabled", { concurrency: 1 }, async () => {
  const { app, server } = await createTestApp();

  try {
    const health = await request(app).get("/api/online/health").expect(200);
    assert.deepEqual(health.body, {
      websocketEnabled: false,
      websocketPort: 0,
      status: "disabled",
      activeMatches: 0,
      activePlayers: 0,
      connectedSockets: 0,
      uptimeMs: 0,
    });

    await request(app)
      .post("/api/online/create")
      .send({ profileId: "guest-profile" })
      .expect(503);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => (error ? reject(error) : resolve()));
      });
    }
  }
});
