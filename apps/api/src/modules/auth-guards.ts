import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export type AuthUser = {
  id: string;
  role: "trainer" | "student";
};

export async function requireAuth(
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

export async function requireTrainer(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; trainerId: string } | null> {
  const user = await requireAuth(request, reply);
  if (!user) return null;
  if (user.role !== "trainer") {
    reply.code(403).send({ error: "forbidden" });
    return null;
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!trainer) {
    reply.code(403).send({ error: "trainer_profile_not_found" });
    return null;
  }

  return { userId: user.id, trainerId: trainer.id };
}

export async function requireStudent(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; studentId: string } | null> {
  const user = await requireAuth(request, reply);
  if (!user) return null;
  if (user.role !== "student") {
    reply.code(403).send({ error: "forbidden" });
    return null;
  }

  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });
  if (!student) {
    reply.code(403).send({ error: "student_profile_not_found" });
    return null;
  }

  return { userId: user.id, studentId: student.id };
}
