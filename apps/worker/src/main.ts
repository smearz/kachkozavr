import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { dispatchTriggerJob, registerRecurringTriggerJobs } from "./events/dispatcher.js";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

const triggerQueue = new Queue("trigger-evaluation", { connection });

const worker = new Worker(
  "trigger-evaluation",
  async (job) => {
    await dispatchTriggerJob(job.name, job.data);
    console.log(`[worker] processed job ${job.id} (${job.name})`);
  },
  { connection }
);

worker.on("ready", () => {
  console.log("[worker] ready");
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed`, err);
});

await registerRecurringTriggerJobs(triggerQueue);
