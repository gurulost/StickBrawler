import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { Pool } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth-routes";
import { configurePassport } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { env } from "./env";
import { initOnlineSocketServer } from "./online/serverProvider";
import { ONLINE_MULTIPLAYER_ENABLED } from "@shared/productFlags";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PgSession = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);

const sessionStore = env.DATABASE_URL
  ? new PgSession({
      pool: new Pool({ connectionString: env.DATABASE_URL }),
      createTableIfMissing: true,
    })
  : new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    });

if (!env.DATABASE_URL) {
  log("DATABASE_URL not set, using in-memory sessions.", "auth");
}

app.use(
  session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerAuthRoutes(app);
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve both the API and client from one HTTP server.
  const port = env.PORT;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });

  // Online multiplayer WebSocket server (feature-flagged)
  const onlineSocketServer = initOnlineSocketServer({
    enabled: ONLINE_MULTIPLAYER_ENABLED && env.ENABLE_ONLINE_MULTIPLAYER,
    port: env.ONLINE_WS_PORT,
  });

  if (onlineSocketServer) {
    log(`online multiplayer websocket server started on port ${env.ONLINE_WS_PORT}`, "websocket");
  } else if (ONLINE_MULTIPLAYER_ENABLED) {
    log(`online multiplayer disabled (set ENABLE_ONLINE_MULTIPLAYER=true to enable)`, "websocket");
  } else {
    log(`online multiplayer disabled for this local playtest build`, "websocket");
  }
})();
