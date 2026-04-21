import { prisma } from "../lib/prisma.js";

const RULE_CODE = "no_report_7d";
const THRESHOLD_DAYS = 7;

function thresholdDate(): Date {
  return new Date(Date.now() - THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
}

export async function evaluateNoReport7dForStudent(studentId: string): Promise<void> {
  const lastReport = await prisma.trainingReport.findFirst({
    where: { studentId },
    orderBy: { submittedAt: "desc" },
    select: { id: true, submittedAt: true }
  });

  const activeTrigger = await prisma.trigger.findFirst({
    where: {
      studentId,
      ruleCode: RULE_CODE,
      status: "active"
    },
    select: { id: true }
  });

  const threshold = thresholdDate();
  const shouldBeActive = !lastReport || lastReport.submittedAt < threshold;

  if (shouldBeActive) {
    if (activeTrigger) return;

    await prisma.trigger.create({
      data: {
        studentId,
        ruleCode: RULE_CODE,
        status: "active",
        explanation: {
          code: RULE_CODE,
          thresholdDays: THRESHOLD_DAYS,
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

export async function reconcileNoReport7dForAllStudents(): Promise<number> {
  const students = await prisma.student.findMany({
    select: { id: true }
  });

  for (const student of students) {
    await evaluateNoReport7dForStudent(student.id);
  }

  return students.length;
}
