import argon2 from "argon2";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const trainerSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/trainer/signup", async (request, reply) => {
    const parsed = trainerSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { email, password, displayName } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "email_already_exists" });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id
    });

    const user = await prisma.user.create({
      data: {
        role: "trainer",
        email,
        passwordHash,
        displayName,
        trainer: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true
      }
    });

    const token = await reply.jwtSign({
      sub: user.id,
      role: "trainer"
    });

    return reply.code(201).send({
      user,
      token
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        displayName: true
      }
    });

    if (!user) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const passwordOk = await argon2.verify(user.passwordHash, password);
    if (!passwordOk) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      role: user.role
    });

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName
      },
      token
    });
  });
}
