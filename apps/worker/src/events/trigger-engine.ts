import { prisma } from "../lib/prisma.js";
import { TRIGGER_RULES } from "./config.js";

function thresholdDate(thresholdDays: number): Date {
  return new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
}

export async function evaluateNoReport7dForStudent(studentId: string): Promise<void> {
  const rule = TRIGGER_RULES.no_report_7d;

  const lastReport = await prisma.trainingReport.findFirst({
    where: { studentId },
    orderBy: { submittedAt: "desc" },
    select: { id: true, submittedAt: true }
  });

  const activeTrigger = await prisma.trigger.findFirst({
    where: {
      studentId,
      ruleCode: rule.code,
      status: "active"
    },
    select: { id: true }
  });

  const threshold = thresholdDate(rule.thresholdDays);
  const shouldBeActive = !lastReport || lastReport.submittedAt < threshold;

  if (shouldBeActive) {
    if (activeTrigger) return;

    await prisma.trigger.create({
      data: {
        studentId,
        ruleCode: rule.code,
        status: "active",
        explanation: {
          code: rule.code,
          thresholdDays: rule.thresholdDays,
          lastReportAt: lastReport?.submittedAt ?? null,
          checkedAt: new Date().toISOString()
        }
      }
    });
    return;
  }

  if (!activeTrigger) return;

  await prisma.trigger.update({
    where: { id: activeTrigger.id },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolutionNote: "auto_resolved_new_report"
    }
  });
}

export async function reconcileNoReport7dForActiveAssignments(): Promise<number> {
  const activeAssignments = await prisma.assignment.findMany({
    where: { isActive: true },
    select: { studentId: true }
  });

  const uniqueStudentIds = [...new Set<string>(activeAssignments.map((a: any) => String(a.studentId)))];

  for (const studentId of uniqueStudentIds) {
    await evaluateNoReport7dForStudent(studentId);
  }

  return uniqueStudentIds.length;
}
