import { Queue } from "bullmq";
import { TRIGGER_RULES } from "./config.js";
import { evaluateAllRulesForStudent, reconcileTriggerRulesForActiveAssignments } from "./trigger-engine.js";

export type TriggerJobName = "report-submitted" | "reconcile-no-report-7d" | "reconcile-trigger-rules";

export async function dispatchTriggerJob(jobName: string, payload: any): Promise<void> {
  if (jobName === "report-submitted") {
    const studentId = String(payload?.studentId ?? "");
    if (!studentId) return;
    await evaluateAllRulesForStudent(studentId);
    return;
  }

  if (jobName === "reconcile-no-report-7d" || jobName === "reconcile-trigger-rules") {
    await reconcileTriggerRulesForActiveAssignments();
    return;
  }
}

export async function registerRecurringTriggerJobs(queue: Queue): Promise<void> {
  const rule = TRIGGER_RULES.no_report_7d;
  await queue.add(
    "reconcile-trigger-rules",
    {},
    {
      jobId: "reconcile-trigger-rules",
      repeat: { every: rule.reconcileEveryMs },
      removeOnComplete: 20,
      removeOnFail: 20
    }
  );
}
