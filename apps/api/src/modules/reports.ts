import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireStudent } from "./auth-guards.js";
import { triggerQueue } from "../queues/trigger-queue.js";

const submitReportSchema = z.object({
  assignmentId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128),
  workoutStatus: z.enum(["completed", "partial", "skipped"]),
  comment: z.string().max(2000).optional(),
  wellbeing: z
    .object({
      score: z.number().int().min(1).max(5),
      label: z.string().max(120).optional()
    })
    .optional(),
  executions: z
    .array(
      z.object({
        workoutExerciseId: z.string().min(1),
        status: z.enum(["done", "skipped", "modified"]),
        actualWeight: z.number().min(0).optional(),
        actualReps: z.number().int().min(0).max(200).optional(),
        comment: z.string().max(500).optional()
      })
    )
    .min(1)
});

export async function registerReportRoutes(app: FastifyInstance) {
  app.post("/reports/submit", async (request, reply) => {
    const auth = await requireStudent(request, reply);
    if (!auth) return;

    const parsed = submitReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.issues });
    }

    const input = parsed.data;

    const existing = await prisma.trainingReport.findUnique({
      where: {
        studentId_idempotencyKey: {
          studentId: auth.studentId,
          idempotencyKey: input.idempotencyKey
        }
      },
      include: {
        wellbeing: true,
        executions: true
      }
    });
    if (existing) {
      return reply.send({
        idempotentReplay: true,
        report: existing
      });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: input.assignmentId,
        studentId: auth.studentId
      },
      select: {
        id: true,
        program: {
          select: {
            workouts: {
              select: {
                exercises: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });
    if (!assignment) {
      return reply.code(404).send({ error: "assignment_not_found" });
    }

    const validWorkoutExerciseIds = new Set(
      assignment.program.workouts.flatMap((w: any) => w.exercises.map((e: any) => e.id))
    );
    for (const execution of input.executions) {
      if (!validWorkoutExerciseIds.has(execution.workoutExerciseId)) {
        return reply.code(400).send({
          error: "invalid_workout_exercise_id",
          workoutExerciseId: execution.workoutExerciseId
        });
      }
    }

    let result: any;
    try {
      result = await prisma.$transaction(async (tx: any) => {
        const report = await tx.trainingReport.create({
          data: {
            assignmentId: input.assignmentId,
            studentId: auth.studentId,
            idempotencyKey: input.idempotencyKey,
            workoutStatus: input.workoutStatus,
            comment: input.comment
          },
          select: {
            id: true,
            assignmentId: true,
            studentId: true,
            idempotencyKey: true,
            workoutStatus: true,
            comment: true,
            submittedAt: true
          }
        });

        if (input.wellbeing) {
          await tx.wellbeing.create({
            data: {
              reportId: report.id,
              score: input.wellbeing.score,
              label: input.wellbeing.label
            }
          });
        }

        await tx.exerciseExecution.createMany({
          data: input.executions.map((e) => ({
            reportId: report.id,
            workoutExerciseId: e.workoutExerciseId,
            status: e.status,
            actualWeight: e.actualWeight,
            actualReps: e.actualReps,
            comment: e.comment
          }))
        });

        await tx.domainEvent.create({
          data: {
            eventType: "ReportSubmitted",
            aggregateId: report.id,
            payload: {
              reportId: report.id,
              studentId: auth.studentId,
              assignmentId: input.assignmentId,
              workoutStatus: input.workoutStatus,
              executionCount: input.executions.length
            }
          }
        });

        const fullReport = await tx.trainingReport.findUnique({
          where: { id: report.id },
          include: {
            wellbeing: true,
            executions: true
          }
        });

        return fullReport;
      });
    } catch (error: any) {
      // Race-safe idempotency fallback for concurrent duplicate submits.
      if (error?.code === "P2002") {
        const replay = await prisma.trainingReport.findUnique({
          where: {
            studentId_idempotencyKey: {
              studentId: auth.studentId,
              idempotencyKey: input.idempotencyKey
            }
          },
          include: {
            wellbeing: true,
            executions: true
          }
        });
        if (replay) {
          return reply.send({
            idempotentReplay: true,
            report: replay
          });
        }
      }
      throw error;
    }

    try {
      await Promise.race([
        triggerQueue.add(
          "report-submitted",
          {
            reportId: result.id,
            studentId: auth.studentId,
            assignmentId: input.assignmentId
          },
          {
            removeOnComplete: 50,
            removeOnFail: 50
          }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error("queue_publish_timeout")), 1200))
      ]);
    } catch (error) {
      request.log.warn({ error }, "trigger_queue_enqueue_failed");
    }

    return reply.code(201).send({
      idempotentReplay: false,
      report: result
    });
  });

  app.addHook("onClose", async () => {
    await triggerQueue.close();
  });
}
