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

test("scores API persists and validates payloads", { concurrency: 1 }, async () => {
  await storage.reset();
  const app = await createTestApp();

  const initial = await request(app).get("/api/scores").expect(200);
  assert.equal(initial.body.length, 0);

  await request(app)
    .post("/api/scores")
    .send({ score: 100 })
    .expect(201);

  await request(app)
    .post("/api/scores")
    .send({ userId: 2, score: 250 })
    .expect(201);

  const afterCreate = await request(app).get("/api/scores").expect(200);
  assert.equal(afterCreate.body.length, 2);
  assert.ok(afterCreate.body[0].score >= afterCreate.body[1].score);

  await request(app).post("/api/scores").send({ userId: "abc", score: "bad" }).expect(422);

  const limited = await request(app).get("/api/scores?limit=1").expect(200);
  assert.equal(limited.body.length, 1);
});
