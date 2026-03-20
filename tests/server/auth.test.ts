import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import session from "express-session";
import passport from "passport";
import createMemoryStore from "memorystore";

import { configurePassport } from "../../server/auth";
import { registerAuthRoutes } from "../../server/auth-routes";
import { env } from "../../server/env";
import { storage } from "../../server/storage";

const MemoryStore = createMemoryStore(session);

function createAuthTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  registerAuthRoutes(app);
  return app;
}

configurePassport();

test("auth routes support guest-mode sessions without a database", { concurrency: 1 }, async () => {
  await storage.reset();
  const app = createAuthTestApp();
  const agent = request.agent(app);

  await agent.get("/api/auth/me").expect(401);

  const registration = await agent
    .post("/api/auth/register")
    .send({ username: "guest_mode_player", password: "secret12" })
    .expect(201);

  assert.equal(registration.body.username, "guest_mode_player");

  const me = await agent.get("/api/auth/me").expect(200);
  assert.equal(me.body.username, "guest_mode_player");

  await agent.post("/api/auth/logout").expect(200);
  await agent.get("/api/auth/me").expect(401);
});
