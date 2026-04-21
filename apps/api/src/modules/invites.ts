import { randomBytes, createHash } from "node:crypto";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const createInviteSchema = z.object({
  groupId: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(24 * 7),
  maxUses: z.number().int().min(1).max(10).default(1)
});

const revokeInviteSchema = z.object({
  inviteId: z.string().min(1)
});

const validateInviteQuerySchema = z.object({
  token: z.string().min(20)
});

type AuthUser = {
  id: string;
  role: "trainer" | "student";
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  try {
    const payload = await request.jwtVerify<{ sub: string; role: "trainer" | "student" }>();
    return { id: payload.sub, role: payload.role };
  } catch {
    reply.code(401).send({ error: "unauthorized" });
    return null;
  }
}

async function requireTrainer(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await requireAuth(request, reply);
  if (!user) return null;
  if (user.role !== "trainer") {
    reply.code(403).send({ error: "forbidden" });
    return null;
  }
  return user;
}

export async function registerInviteRoutes(app: FastifyInstance) {
  app.post("/invites", async (request, reply) => {
    const user = await requireTrainer(request, reply);
    if (!user) return;

    const parsed = createInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { groupId, expiresInHours, maxUses } = parsed.data;

    const trainer = await prisma.trainer.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    if (!trainer) {
      return reply.code(403).send({ error: "trainer_profile_not_found" });
    }

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        trainerId: trainer.id
      },
      select: { id: true, name: true }
    });
    if (!group) {
      return reply.code(404).send({ error: "group_not_found" });
    }

    const token = randomBytes(24).toString("base64url");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        groupId: group.id,
        tokenHash,
        expiresAt,
        maxUses,
        status: "active"
      },
      select: {
        id: true,
        groupId: true,
        status: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        createdAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "invite_created",
        entityType: "invite",
        entityId: invite.id,
        payload: {
          groupId: invite.groupId,
          expiresAt: invite.expiresAt,
          maxUses: invite.maxUses
        }
      }
    });

    return reply.code(201).send({
      invite,
      token,
      inviteLink: `/join?token=${token}`
    });
  });

  app.post("/invites/revoke", async (request, reply) => {
    const user = await requireTrainer(request, reply);
    if (!user) return;

    const parsed = revokeInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { inviteId } = parsed.data;

    const trainer = await prisma.trainer.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });
    if (!trainer) {
      return reply.code(403).send({ error: "trainer_profile_not_found" });
    }

    const invite = await prisma.invite.findFirst({
      where: {
        id: inviteId,
        group: {
          trainerId: trainer.id
        }
      },
      select: {
        id: true,
        status: true
      }
    });
    if (!invite) {
      return reply.code(404).send({ error: "invite_not_found" });
    }

    if (invite.status === "revoked") {
      return reply.send({ ok: true, alreadyRevoked: true });
    }

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: "revoked",
        revokedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "invite_revoked",
        entityType: "invite",
        entityId: invite.id,
        payload: {}
      }
    });

    return reply.send({ ok: true });
  });

  app.get("/invites/validate", async (request, reply) => {
    const parsed = validateInviteQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { token } = parsed.data;
    const tokenHash = sha256(token);

    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!invite) {
      return reply.code(404).send({ valid: false, error: "invite_not_found" });
    }

    const now = Date.now();
    const isExpired = invite.expiresAt.getTime() <= now;
    const isUsedOut = invite.usedCount >= invite.maxUses;
    const isRevoked = invite.status === "revoked";
    const valid = !isExpired && !isUsedOut && !isRevoked && invite.status === "active";

    return reply.send({
      valid,
      invite: {
        id: invite.id,
        status: invite.status,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
        group: invite.group
      },
      reason: valid ? null : isRevoked ? "revoked" : isExpired ? "expired" : isUsedOut ? "used_out" : "invalid"
    });
  });
}
