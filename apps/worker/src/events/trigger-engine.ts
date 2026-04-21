import { prisma } from "../lib/prisma.js";
import { TRIGGER_RULES } from "./config.js";

function thresholdDate(thresholdDays: number): Date {
  return new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
}

async function getActiveTrigger(studentId: string, ruleCode: string) {
  return prisma.trigger.findFirst({
    where: {
      studentId,
      ruleCode,
      status: "active"
    },
    select: { id: true }
  });
}

async function activateTrigger(studentId: string, ruleCode: string, explanation: unknown): Promise<void> {
  const activeTrigger = await getActiveTrigger(studentId, ruleCode);
  if (activeTrigger) return;

  await prisma.trigger.create({
    data: {
      studentId,
      ruleCode,
      status: "active",
      explanation
    }
  });
}

async function resolveTriggerIfActive(studentId: string, ruleCode: string, reason: string): Promise<void> {
  const activeTrigger = await getActiveTrigger(studentId, ruleCode);
  if (!activeTrigger) return;

  await prisma.trigger.update({
    where: { id: activeTrigger.id },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolutionNote: reason
    }
  });
}

export async function evaluateNoReport7dForStudent(studentId: string): Promise<void> {
  const rule = TRIGGER_RULES.no_report_7d;

  const lastReport = await prisma.trainingReport.findFirst({
    where: { studentId },
    orderBy: { submittedAt: "desc" },
    select: { id: true, submittedAt: true }
  });

  const threshold = thresholdDate(rule.thresholdDays);
  const shouldBeActive = !lastReport || lastReport.submittedAt < threshold;

  if (shouldBeActive) {
    await activateTrigger(studentId, rule.code, {
      code: rule.code,
      thresholdDays: rule.thresholdDays,
      lastReportAt: lastReport?.submittedAt ?? null,
      checkedAt: new Date().toISOString()
    });
    return;
  }

  await resolveTriggerIfActive(studentId, rule.code, "auto_resolved_new_report");
}

export async function evaluateTwoSkippedInRowForStudent(studentId: string): Promise<void> {
  const rule = TRIGGER_RULES.two_skipped_in_row;
  const latestReports = await prisma.trainingReport.findMany({
    where: { studentId },
    orderBy: { submittedAt: "desc" },
    take: rule.requiredConsecutiveSkips,
    select: {
      id: true,
      submittedAt: true,
      workoutStatus: true
    }
  });

  const hasEnoughReports = latestReports.length === rule.requiredConsecutiveSkips;
  const allSkipped = hasEnoughReports && latestReports.every((r: any) => r.workoutStatus === "skipped");

  if (allSkipped) {
    await activateTrigger(studentId, rule.code, {
      code: rule.code,
      requiredConsecutiveSkips: rule.requiredConsecutiveSkips,
      reports: latestReports.map((r: any) => ({
        id: r.id,
        submittedAt: r.submittedAt,
        workoutStatus: r.workoutStatus
      })),
      checkedAt: new Date().toISOString()
    });
    return;
  }

  await resolveTriggerIfActive(studentId, rule.code, "auto_resolved_skip_streak_broken");
}

export async function evaluateWellbeingLowNTimesForStudent(studentId: string): Promise<void> {
  const rule = TRIGGER_RULES.wellbeing_low_n_times;
  const windowFrom = thresholdDate(rule.windowDays);

  const lowWellbeingReports = await prisma.wellbeing.findMany({
    where: {
      score: { lte: rule.lowScoreThreshold },
      report: {
        studentId,
        submittedAt: { gte: windowFrom }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      score: true,
      createdAt: true,
      report: {
        select: {
          id: true,
          submittedAt: true
        }
      }
    }
  });

  const shouldBeActive = lowWellbeingReports.length >= rule.requiredOccurrences;
  if (shouldBeActive) {
    await activateTrigger(studentId, rule.code, {
      code: rule.code,
      threshold: {
        lowScoreThreshold: rule.lowScoreThreshold,
        requiredOccurrences: rule.requiredOccurrences,
        windowDays: rule.windowDays
      },
      occurrences: lowWellbeingReports.map((w: any) => ({
        wellbeingId: w.id,
        score: w.score,
        reportId: w.report.id,
        submittedAt: w.report.submittedAt
      })),
      checkedAt: new Date().toISOString()
    });
    return;
  }

  await resolveTriggerIfActive(studentId, rule.code, "auto_resolved_wellbeing_recovered");
}

export async function evaluateAllRulesForStudent(studentId: string): Promise<void> {
  await evaluateNoReport7dForStudent(studentId);
  await evaluateTwoSkippedInRowForStudent(studentId);
  await evaluateWellbeingLowNTimesForStudent(studentId);
}

export async function reconcileTriggerRulesForActiveAssignments(): Promise<number> {
  const activeAssignments = await prisma.assignment.findMany({
    where: { isActive: true },
    select: { studentId: true }
  });

  const uniqueStudentIds = [...new Set<string>(activeAssignments.map((a: any) => String(a.studentId)))];

  for (const studentId of uniqueStudentIds) {
    await evaluateAllRulesForStudent(studentId);
  }

  return uniqueStudentIds.length;
}
