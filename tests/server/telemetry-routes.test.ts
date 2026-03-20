import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { registerRoutes } from "../../server/routes";
import { drainTelemetryBuffer } from "../../server/telemetry";

async function createTelemetryTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = await registerRoutes(app);
  return { app, server };
}

test("telemetry routes accept mixed combat events and summarize hits only", { concurrency: 1 }, async () => {
  drainTelemetryBuffer();
  const { app, server } = await createTelemetryTestApp();

  try {
    await request(app)
      .post("/api/telemetry")
      .send({
        entries: [
          {
            type: "input",
            source: "player",
            slot: "player1",
            direction: "forward",
            attackStrength: "light",
            attackAltitude: "ground",
            defendModes: ["guard"],
            moveId: "hero_jab_1",
            grounded: true,
            timestamp: 100,
          },
          {
            type: "tech",
            source: "cpu",
            slot: "cpu",
            result: "success",
            landingLag: 0.2,
            timestamp: 101,
          },
          {
            type: "hit",
            source: "player",
            slot: "player1",
            comboCount: 3,
            timestamp: 102,
            hit: {
              moveId: "hero_jab_1",
              hitboxId: "jab_hand",
              damage: 7,
              guardDamage: 3,
              knockbackVector: [1, 2, 0],
              hitLag: 4,
              causesTrip: false,
              isCounterHit: false,
              launchAngleDeg: 25,
              attackerAction: "attack",
              defenderAction: "idle",
            },
          },
        ],
      })
      .expect(204);

    const summary = await request(app).get("/api/telemetry/summary").expect(200);
    assert.equal(summary.body.entries, 3);
    assert.deepEqual(summary.body.summary.player1, {
      hits: 1,
      totalDamage: 7,
      maxCombo: 3,
      lastTimestamp: 102,
    });
    assert.deepEqual(summary.body.summary.cpu, {
      hits: 0,
      totalDamage: 0,
      maxCombo: 0,
      lastTimestamp: 0,
    });
  } finally {
    drainTelemetryBuffer();
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => (error ? reject(error) : resolve()));
      });
    }
  }
});

test("telemetry routes still reject malformed combat events", { concurrency: 1 }, async () => {
  drainTelemetryBuffer();
  const { app, server } = await createTelemetryTestApp();

  try {
    await request(app)
      .post("/api/telemetry")
      .send({
        entries: [
          {
            type: "input",
            source: "player",
            slot: "player1",
            direction: "diagonal",
            defendModes: [],
            grounded: true,
            timestamp: 100,
          },
        ],
      })
      .expect(422);
  } finally {
    drainTelemetryBuffer();
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => (error ? reject(error) : resolve()));
      });
    }
  }
});
