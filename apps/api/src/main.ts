import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerAuthRoutes } from "./modules/auth.js";
import { registerInviteRoutes } from "./modules/invites.js";
import { registerProgramRoutes } from "./modules/programs.js";
import { registerReportRoutes } from "./modules/reports.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? "local-dev-jwt-secret"
});

await registerAuthRoutes(app);
await registerInviteRoutes(app);
await registerProgramRoutes(app);
await registerReportRoutes(app);

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
