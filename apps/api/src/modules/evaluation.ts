import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireTrainer } from "./auth-guards.js";

type TrendDirection = "up" | "down" | "flat";

function round(value: number, digits = 2): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function computeDirection(first: number, last: number): TrendDirection {
  if (first === 0 && last === 0) return "flat";
  if (first === 0 && last > 0) return "up";
  const change = (last - first) / Math.abs(first || 1);
  if (change > 0.05) return "up";
  if (change < -0.05) return "down";
  return "flat";
}

export async function registerEvaluationRoutes(app: FastifyInstance) {
  app.get("/trainer/students/:studentId/program-evaluation", async (request, reply) => {
    const auth = await requireTrainer(request, reply);
    if (!auth) return;

    const studentId = (request.params as { studentId?: string }).studentId;
    if (!studentId) {
      return reply.code(400).send({ error: "student_id_required" });
    }

    const inTrainerGroup = await prisma.groupMembership.findFirst({
      where: {
        studentId,
        group: {
          trainerId: auth.trainerId
        }
      },
      select: { id: true }
    });
    if (!inTrainerGroup) {
      return reply.code(403).send({ error: "student_not_in_trainer_group" });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        studentId,
        isActive: true,
        program: {
          trainerId: auth.trainerId
        }
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
    if (!assignment) {
      return reply.code(404).send({ error: "no_active_assignment" });
    }

    const reports = await prisma.trainingReport.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { submittedAt: "asc" },
      include: {
        executions: {
          include: {
            workoutExercise: {
              include: {
                exercise: true
              }
            }
          }
        }
      }
    });

    const totalReports = reports.length;
    const completedCount = reports.filter((r: any) => r.workoutStatus === "completed").length;
    const partialCount = reports.filter((r: any) => r.workoutStatus === "partial").length;
    const skippedCount = reports.filter((r: any) => r.workoutStatus === "skipped").length;
    const adherenceRate =
      totalReports === 0 ? 0 : round(((completedCount + partialCount) / totalReports) * 100, 1);

    const deltas: Array<{
      exerciseId: string;
      exerciseName: string;
      repsDelta?: number;
      weightDelta?: number;
      actualWeight?: number;
      actualReps?: number;
      submittedAt: Date;
    }> = [];

    for (const report of reports as any[]) {
      for (const execution of report.executions) {
        const wx = execution.workoutExercise;
        const exerciseId = String(wx.exerciseId);
        const exerciseName = String(wx.exercise?.name ?? "Unknown Exercise");
        const item: any = {
          exerciseId,
          exerciseName,
          submittedAt: report.submittedAt
        };
        if (typeof execution.actualReps === "number" && typeof wx.plannedReps === "number") {
          item.repsDelta = execution.actualReps - wx.plannedReps;
          item.actualReps = execution.actualReps;
        }
        if (typeof execution.actualWeight === "number" && typeof wx.plannedWeight === "number") {
          item.weightDelta = execution.actualWeight - wx.plannedWeight;
          item.actualWeight = execution.actualWeight;
        }
        if (item.repsDelta !== undefined || item.weightDelta !== undefined) {
          deltas.push(item);
        }
      }
    }

    const avgRepsDelta =
      deltas.filter((d) => typeof d.repsDelta === "number").length > 0
        ? round(
            deltas
              .filter((d) => typeof d.repsDelta === "number")
              .reduce((acc, d) => acc + (d.repsDelta as number), 0) /
              deltas.filter((d) => typeof d.repsDelta === "number").length,
            2
          )
        : null;

    const avgWeightDelta =
      deltas.filter((d) => typeof d.weightDelta === "number").length > 0
        ? round(
            deltas
              .filter((d) => typeof d.weightDelta === "number")
              .reduce((acc, d) => acc + (d.weightDelta as number), 0) /
              deltas.filter((d) => typeof d.weightDelta === "number").length,
            2
          )
        : null;

    const byExerciseMap = new Map<
      string,
      { exerciseId: string; exerciseName: string; repsDeltas: number[]; weightDeltas: number[]; points: any[] }
    >();
    for (const d of deltas) {
      const bucket =
        byExerciseMap.get(d.exerciseId) ??
        {
          exerciseId: d.exerciseId,
          exerciseName: d.exerciseName,
          repsDeltas: [],
          weightDeltas: [],
          points: []
        };
      if (typeof d.repsDelta === "number") bucket.repsDeltas.push(d.repsDelta);
      if (typeof d.weightDelta === "number") bucket.weightDeltas.push(d.weightDelta);
      bucket.points.push(d);
      byExerciseMap.set(d.exerciseId, bucket);
    }

    const byExercise = [...byExerciseMap.values()].map((b) => ({
      exerciseId: b.exerciseId,
      exerciseName: b.exerciseName,
      avgRepsDelta:
        b.repsDeltas.length > 0 ? round(b.repsDeltas.reduce((a, v) => a + v, 0) / b.repsDeltas.length, 2) : null,
      avgWeightDelta:
        b.weightDeltas.length > 0
          ? round(b.weightDeltas.reduce((a, v) => a + v, 0) / b.weightDeltas.length, 2)
          : null,
      sampleSize: b.points.length
    }));

    const trends = [...byExerciseMap.values()]
      .map((b) => {
        const sorted = b.points.sort((a, z) => +new Date(a.submittedAt) - +new Date(z.submittedAt));
        const weightSeries = sorted.filter((p) => typeof p.actualWeight === "number").map((p) => p.actualWeight as number);
        const repsSeries = sorted.filter((p) => typeof p.actualReps === "number").map((p) => p.actualReps as number);

        if (weightSeries.length >= 2) {
          const first = weightSeries[0];
          const last = weightSeries[weightSeries.length - 1];
          return {
            exerciseId: b.exerciseId,
            exerciseName: b.exerciseName,
            metric: "weight",
            first,
            last,
            direction: computeDirection(first, last)
          };
        }
        if (repsSeries.length >= 2) {
          const first = repsSeries[0];
          const last = repsSeries[repsSeries.length - 1];
          return {
            exerciseId: b.exerciseId,
            exerciseName: b.exerciseName,
            metric: "reps",
            first,
            last,
            direction: computeDirection(first, last)
          };
        }
        return null;
      })
      .filter(Boolean);

    return reply.send({
      assignment: {
        id: assignment.id,
        startsAt: assignment.startsAt,
        program: {
          id: assignment.program.id,
          name: assignment.program.name
        }
      },
      adherence: {
        totalReports,
        completedCount,
        partialCount,
        skippedCount,
        adherenceRate
      },
      planVsActual: {
        overall: {
          avgRepsDelta,
          avgWeightDelta,
          sampleSize: deltas.length
        },
        byExercise
      },
      trends
    });
  });
}
