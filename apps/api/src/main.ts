import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { registerAuthRoutes } from "./modules/auth.js";
import { registerGroupRoutes } from "./modules/groups.js";
import { registerInviteRoutes } from "./modules/invites.js";
import { registerProgramRoutes } from "./modules/programs.js";
import { registerReportRoutes } from "./modules/reports.js";
import { registerMediaRoutes } from "./modules/media.js";
import { registerTriggerRoutes } from "./modules/triggers.js";

const app = Fastify({ logger: true });
const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret && nodeEnv !== "development") {
  throw new Error("JWT_SECRET is required outside development environment.");
}

await app.register(cors, {
  origin: true,
  credentials: true
});

await app.register(jwt, {
  secret: jwtSecret ?? "local-dev-jwt-secret"
});

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

await registerAuthRoutes(app);
await registerGroupRoutes(app);
await registerInviteRoutes(app);
await registerProgramRoutes(app);
await registerReportRoutes(app);
await registerMediaRoutes(app);
await registerTriggerRoutes(app);

app.get("/health", async () => {
  return {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  };
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
