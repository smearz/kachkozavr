import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireTrainer } from "./auth-guards.js";

const createGroupSchema = z.object({
  name: z.string().min(1).max(120)
});

export async function registerGroupRoutes(app: FastifyInstance) {
  app.post("/groups", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const parsed = createGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const group = await prisma.group.create({
      data: {
        trainerId: auth.trainerId,
        name: parsed.data.name
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    return reply.code(201).send({ group });
  });

  app.get("/groups", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const groups = await prisma.group.findMany({
      where: { trainerId: auth.trainerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    return reply.send({ groups });
  });
}
