import { Worker } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  "trigger-evaluation",
  async (job) => {
    // Placeholder: здесь будет обработка trigger rules.
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
