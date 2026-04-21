import { Queue } from "bullmq";
import { TRIGGER_RULES } from "./config.js";
import { evaluateNoReport7dForStudent, reconcileNoReport7dForActiveAssignments } from "./trigger-engine.js";

export type TriggerJobName = "report-submitted" | "reconcile-no-report-7d";

export async function dispatchTriggerJob(jobName: string, payload: any): Promise<void> {
  if (jobName === "report-submitted") {
    const studentId = String(payload?.studentId ?? "");
    if (!studentId) return;
    await evaluateNoReport7dForStudent(studentId);
    return;
  }

  if (jobName === "reconcile-no-report-7d") {
    await reconcileNoReport7dForActiveAssignments();
    return;
  }
}

export async function registerRecurringTriggerJobs(queue: Queue): Promise<void> {
  const rule = TRIGGER_RULES.no_report_7d;
  await queue.add(
    "reconcile-no-report-7d",
    {},
    {
      jobId: "reconcile-no-report-7d",
      repeat: { every: rule.reconcileEveryMs },
      removeOnComplete: 20,
      removeOnFail: 20
    }
  );
}
