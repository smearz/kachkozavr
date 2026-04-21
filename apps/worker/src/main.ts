import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { evaluateNoReport7dForStudent, reconcileNoReport7dForAllStudents } from "./triggers/no-report-7d.js";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

const triggerQueue = new Queue("trigger-evaluation", { connection });

const worker = new Worker(
  "trigger-evaluation",
  async (job) => {
    if (job.name === "report-submitted") {
      const studentId = String(job.data?.studentId ?? "");
      if (!studentId) return;
      await evaluateNoReport7dForStudent(studentId);
      console.log(`[worker] evaluated no_report_7d for student ${studentId}`);
      return;
    }

    if (job.name === "reconcile-no-report-7d") {
      const count = await reconcileNoReport7dForAllStudents();
      console.log(`[worker] reconciled no_report_7d for ${count} students`);
      return;
    }

    console.log(`[worker] skipped unknown job ${job.id} (${job.name})`);
  },
  { connection }
);

worker.on("ready", () => {
  console.log("[worker] ready");
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed`, err);
});

// Periodic reconcile to detect inactivity even without new reports.
await triggerQueue.add(
  "reconcile-no-report-7d",
  {},
  {
    jobId: "reconcile-no-report-7d",
    repeat: { every: 6 * 60 * 60 * 1000 },
    removeOnComplete: 20,
    removeOnFail: 20
  }
);
