import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireStudent, requireTrainer } from "./auth-guards.js";

const createProgramSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  workouts: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        dayOrder: z.number().int().min(1),
        exercises: z
          .array(
            z.object({
              exerciseId: z.string().min(1),
              position: z.number().int().min(1),
              plannedWeight: z.number().min(0).optional(),
              plannedReps: z.number().int().min(1).max(100).optional(),
              notes: z.string().max(500).optional()
            })
          )
          .min(1)
      })
    )
    .min(1)
});

const createAssignmentSchema = z.object({
  programId: z.string().min(1),
  studentId: z.string().min(1),
  startsAt: z.string().datetime().optional()
});

export async function registerProgramRoutes(app: FastifyInstance) {
  app.post("/programs", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const parsed = createProgramSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const data = parsed.data;
    const exerciseIds = [...new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))];
    const existingExercises = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true }
    });
    if (existingExercises.length !== exerciseIds.length) {
      return reply.code(400).send({ error: "unknown_exercise_id" });
    }

    const program = await prisma.program.create({
      data: {
        trainerId: auth.trainerId,
        name: data.name,
        description: data.description,
        workouts: {
          create: data.workouts.map((workout) => ({
            title: workout.title,
            dayOrder: workout.dayOrder,
            exercises: {
              create: workout.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                position: ex.position,
                plannedWeight: ex.plannedWeight,
                plannedReps: ex.plannedReps,
                notes: ex.notes
              }))
            }
          }))
        }
      },
      include: {
        workouts: {
          include: {
            exercises: true
          }
        }
      }
    });

    return reply.code(201).send({ program });
  });

  app.get("/programs", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const programs = await prisma.program.findMany({
      where: { trainerId: auth.trainerId },
      orderBy: { createdAt: "desc" },
      include: {
        workouts: {
          include: {
            exercises: true
          }
        }
      }
    });

    return reply.send({ programs });
  });

  app.post("/assignments", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const parsed = createAssignmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const { programId, studentId, startsAt } = parsed.data;

    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        trainerId: auth.trainerId
      },
      select: { id: true }
    });
    if (!program) {
      return reply.code(404).send({ error: "program_not_found" });
    }

    const studentInTrainerGroup = await prisma.groupMembership.findFirst({
      where: {
        studentId,
        group: {
          trainerId: auth.trainerId
        }
      },
      select: { id: true }
    });
    if (!studentInTrainerGroup) {
      return reply.code(403).send({ error: "student_not_in_trainer_group" });
    }

    const assignment = await prisma.$transaction(async (tx: any) => {
      await tx.assignment.updateMany({
        where: {
          studentId,
          isActive: true
        },
        data: {
          isActive: false,
          endsAt: new Date()
        }
      });

      return tx.assignment.create({
        data: {
          programId,
          studentId,
          isActive: true,
          startsAt: startsAt ? new Date(startsAt) : new Date()
        },
        include: {
          program: {
            include: {
              workouts: {
                include: {
                  exercises: {
                    include: {
                      exercise: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    return reply.code(201).send({ assignment });
  });

  app.get("/students/me/current-workout", async (request, reply) => {
    const auth = await requireStudent(request, reply);
    if (!auth) return;

    const assignment = await prisma.assignment.findFirst({
      where: {
        studentId: auth.studentId,
        isActive: true
      },
      orderBy: { createdAt: "desc" },
      include: {
        program: {
          include: {
            workouts: {
              orderBy: { dayOrder: "asc" },
              include: {
                exercises: {
                  orderBy: { position: "asc" },
                  include: {
                    exercise: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      return reply.code(404).send({ error: "no_active_assignment" });
    }

    return reply.send({ assignment });
  });
}
