import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireTrainer } from "./auth-guards.js";

const resolveTriggerSchema = z.object({
  note: z.string().min(1).max(1000)
});

export async function registerTriggerRoutes(app: FastifyInstance) {
  app.get("/trainer/attention-queue", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const triggers = await prisma.trigger.findMany({
      where: {
        status: "active",
        student: {
          memberships: {
            some: {
              group: {
                trainerId: auth.trainerId
              }
            }
          }
        }
      },
      orderBy: [{ activatedAt: "asc" }],
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    return reply.send({
      items: triggers.map((t: any) => ({
        id: t.id,
        ruleCode: t.ruleCode,
        activatedAt: t.activatedAt,
        explanation: t.explanation,
        student: {
          id: t.student.id,
          userId: t.student.user.id,
          email: t.student.user.email,
          displayName: t.student.user.displayName
        }
      }))
    });
  });

  app.post("/trainer/triggers/:triggerId/resolve", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const triggerId = (request.params as { triggerId?: string }).triggerId;
    if (!triggerId) {
      return reply.code(400).send({ error: "trigger_id_required" });
    }

    const parsed = resolveTriggerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const trigger = await prisma.trigger.findFirst({
      where: {
        id: triggerId,
        student: {
          memberships: {
            some: {
              group: {
                trainerId: auth.trainerId
              }
            }
          }
        }
      },
      select: {
        id: true,
        status: true,
        studentId: true,
        ruleCode: true
      }
    });
    if (!trigger) {
      return reply.code(404).send({ error: "trigger_not_found" });
    }

    if (trigger.status !== "active") {
      return reply.code(400).send({ error: "trigger_not_active" });
    }

    const resolved = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.trigger.update({
        where: { id: trigger.id },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolvedById: auth.userId,
          resolutionNote: parsed.data.note
        }
      });

      await tx.domainEvent.create({
        data: {
          eventType: "TriggerResolved",
          aggregateId: trigger.id,
          payload: {
            triggerId: trigger.id,
            studentId: trigger.studentId,
            ruleCode: trigger.ruleCode,
            resolvedByUserId: auth.userId
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: auth.userId,
          action: "trigger_resolved",
          entityType: "trigger",
          entityId: trigger.id,
          payload: {
            note: parsed.data.note
          }
        }
      });

      return updated;
    });

    return reply.send({ trigger: resolved });
  });
}
