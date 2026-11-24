import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const QUEUE_NAME = "email-send";

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: false,
  },
});

/** Enqueue a delayed job. jobId === emailId, so re-adding the same email is a no-op (idempotent). */
export function jobFor(emailId: string, scheduledAt: Date) {
  return {
    name: "send",
    data: { emailId },
    opts: { jobId: emailId, delay: Math.max(0, scheduledAt.getTime() - Date.now()) },
  };
}


// New code by Chatgpt

// export function jobFor(emailId: string, scheduledAt: Date) {
//   const currentTime = Date.now();
//   const scheduledTime = scheduledAt.getTime();

//   if (isNaN(scheduledTime)) {
//     throw new Error("Invalid scheduled date");
//   }

//   if (!emailId) {
//     throw new Error("Email ID is required");
//   }

//   const delay = scheduledTime - currentTime;

//   console.log("[Scheduler] Email ID:", emailId);
//   console.log("[Scheduler] Scheduled at:", scheduledAt.toISOString());
//   console.log("[Scheduler] Current time:", new Date(currentTime).toISOString());
//   console.log("[Scheduler] Delay:", delay, "ms");

//   return {
//     name: "send",
//     data: { emailId },
//     opts: {
//       jobId: emailId,
//       delay: Math.max(0, delay),
//       removeOnComplete: true,
//       removeOnFail: false,
//     },
//   };
// }
