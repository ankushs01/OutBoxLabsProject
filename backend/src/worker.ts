import { Worker, DelayedError } from "bullmq";
import { config } from "./config.js";
import { pool, initDb } from "./db.js";
import { redis } from "./redis.js";
import { QUEUE_NAME, EmailJobData } from "./queue.js";
import { tryAcquireSlot, overflowRank, nextWindowStart, firstLimitHit } from "./rateLimiter.js";
import { sendMail, Sender } from "./mailer.js";
import { indexEmail, initSearch } from "./search.js";
import { notifySlack } from "./slack.js";

const STALE_CLAIM_MS = 5 * 60_000;

async function markFinal(id: string, status: "sent" | "failed", fields: { error?: string; previewUrl?: string | null }) {
  const { rows } = await pool.query(
    `UPDATE emails SET status=$2, sent_at=now(), error=$3, preview_url=$4 WHERE id=$1
     RETURNING user_id, to_email, subject, body, scheduled_at, sent_at`,
    [id, status, fields.error ?? null, fields.previewUrl ?? null]
  );
  const r = rows[0];
  if (r) {
    await indexEmail({
      id, userId: r.user_id, to: r.to_email, subject: r.subject, body: r.body,
      status, scheduledAt: r.scheduled_at, sentAt: r.sent_at,
    });
  }
}

export function startWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job, token) => {
      const { emailId } = job.data;

      // 1. Idempotent claim: only one worker can move scheduled -> sending.
      //    A stale 'sending' claim (worker crashed mid-send) can be re-claimed.
      const claim = await pool.query(
        `UPDATE emails SET status='sending', claimed_at=now()
         WHERE id=$1 AND (status='scheduled' OR (status='sending' AND claimed_at < now() - ($2 || ' milliseconds')::interval))
         RETURNING *`,
        [emailId, String(STALE_CLAIM_MS)]
      );
      if (!claim.rows.length) return { skipped: true }; // already sent / being sent: never duplicate
      const email = claim.rows[0];

      // 2. Hourly per-sender rate limit (Redis, atomic, shared across workers).
      const limit: number = email.hourly_limit ?? config.maxEmailsPerHourPerSender;
      const ok = await tryAcquireSlot(email.sender_id, limit);
      if (!ok) {
        // Release the claim, push the job into the next hour window (not dropped, not failed).
        await pool.query("UPDATE emails SET status='scheduled', claimed_at=NULL WHERE id=$1", [emailId]);
        const rank = await overflowRank(email.sender_id);
        const wakeAt = nextWindowStart() + rank; // +1ms per overflowing job keeps order
        if (await firstLimitHit(email.sender_id)) {
          notifySlack(
            email.user_id,
            `:warning: ReachInbox: sender #${email.sender_id} hit its hourly limit (${limit}/hr). Remaining emails were rescheduled to ${new Date(wakeAt).toISOString()}.`
          );
        }
        await job.moveToDelayed(wakeAt, token);
        throw new DelayedError();
      }

      // 3. Send.
      const { rows: sRows } = await pool.query("SELECT * FROM senders WHERE id=$1", [email.sender_id]);
      const sender = sRows[0] as Sender;
      try {
        const previewUrl = await sendMail(sender, email.to_email, email.subject, email.body);
        await markFinal(emailId, "sent", { previewUrl });
        return { sent: true };
      } catch (err) {
        const msg = (err as Error).message;
        const isLast = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        if (isLast) await markFinal(emailId, "failed", { error: msg });
        else await pool.query("UPDATE emails SET status='scheduled', claimed_at=NULL, error=$2 WHERE id=$1", [emailId, msg]);
        throw err; // lets BullMQ retry with backoff
      }
    },
    {
      connection: redis,
      concurrency: config.workerConcurrency,
      // Global (cross-worker) throttle: at most 1 send per MIN_DELAY_BETWEEN_EMAILS_MS.
      limiter: { max: 1, duration: config.minDelayMs },
    }
  );
  worker.on("failed", (job, err) => console.warn(`[worker] job ${job?.id} failed: ${err.message}`));
  return worker;
}

// Run standalone: `npm run dev:worker`
if (process.argv[1]?.includes("worker")) {
  (async () => {
    await initDb();
    await initSearch();
    startWorker();
    console.log(`[worker] started concurrency=${config.workerConcurrency} minDelay=${config.minDelayMs}ms`);
  })();
}



// New Code by Chatgpt


// import { Worker, DelayedError } from "bullmq";
// import { config } from "./config.js";
// import { pool, initDb } from "./db.js";
// import { redis } from "./redis.js";
// import { QUEUE_NAME, EmailJobData } from "./queue.js";
// import {
//   tryAcquireSlot,
//   overflowRank,
//   nextWindowStart,
//   firstLimitHit,
// } from "./rateLimiter.js";
// import { sendMail, Sender } from "./mailer.js";
// import { indexEmail, initSearch } from "./search.js";
// import { notifySlack } from "./slack.js";

// const STALE_CLAIM_MS = 5 * 60_000;

// async function markFinal(
//   id: string,
//   status: "sent" | "failed",
//   fields: { error?: string; previewUrl?: string | null }
// ) {
//   const { rows } = await pool.query(
//     `UPDATE emails
//      SET status=$2, sent_at=now(), error=$3, preview_url=$4
//      WHERE id=$1
//      RETURNING user_id, to_email, subject, body, scheduled_at, sent_at`,
//     [id, status, fields.error ?? null, fields.previewUrl ?? null]
//   );

//   const r = rows[0];

//   if (r) {
//     await indexEmail({
//       id,
//       userId: r.user_id,
//       to: r.to_email,
//       subject: r.subject,
//       body: r.body,
//       status,
//       scheduledAt: r.scheduled_at,
//       sentAt: r.sent_at,
//     });
//   }
// }

// export function startWorker() {
//   const worker = new Worker<EmailJobData>(
//     QUEUE_NAME,
//     async (job, token) => {
//       const { emailId } = job.data;

//       // 1. Check the email's scheduled time in PostgreSQL.
//       const scheduledResult = await pool.query(
//         `SELECT status, scheduled_at
//          FROM emails
//          WHERE id=$1`,
//         [emailId]
//       );

//       if (!scheduledResult.rows.length) {
//         return { skipped: true, reason: "Email not found" };
//       }

//       const scheduledEmail = scheduledResult.rows[0];
//       const scheduledTime = new Date(
//         scheduledEmail.scheduled_at
//       ).getTime();

//       // 2. Never send an email before its scheduled time.
//       if (
//         scheduledEmail.status === "scheduled" &&
//         scheduledTime > Date.now()
//       ) {
//         console.log(
//           `[worker] Email ${emailId} is not due yet. Rescheduling for ${new Date(scheduledTime).toISOString()}`
//         );

//         await job.moveToDelayed(scheduledTime, token);
//         throw new DelayedError();
//       }

//       // 3. Claim the email. Only one worker can claim it.
//       const claim = await pool.query(
//         `UPDATE emails
//          SET status='sending', claimed_at=now()
//          WHERE id=$1
//            AND scheduled_at <= now()
//            AND (
//              status='scheduled'
//              OR (
//                status='sending'
//                AND claimed_at < now() - ($2 || ' milliseconds')::interval
//              )
//            )
//          RETURNING *`,
//         [emailId, String(STALE_CLAIM_MS)]
//       );

//       if (!claim.rows.length) {
//         // Check again in case the database clock is ahead.
//         const latest = await pool.query(
//           `SELECT status, scheduled_at
//            FROM emails
//            WHERE id=$1`,
//           [emailId]
//         );

//         if (latest.rows.length && latest.rows[0].status === "scheduled") {
//           const nextScheduledTime = new Date(
//             latest.rows[0].scheduled_at
//           ).getTime();

//           if (nextScheduledTime > Date.now()) {
//             await job.moveToDelayed(nextScheduledTime, token);
//             throw new DelayedError();
//           }
//         }

//         return { skipped: true };
//       }

//       const email = claim.rows[0];

//       // 4. Apply the hourly sender rate limit.
//       const limit: number =
//         email.hourly_limit ?? config.maxEmailsPerHourPerSender;

//       const ok = await tryAcquireSlot(email.sender_id, limit);

//       if (!ok) {
//         await pool.query(
//           "UPDATE emails SET status='scheduled', claimed_at=NULL WHERE id=$1",
//           [emailId]
//         );

//         const rank = await overflowRank(email.sender_id);
//         const wakeAt = nextWindowStart() + rank;

//         if (await firstLimitHit(email.sender_id)) {
//           notifySlack(
//             email.user_id,
//             `:warning: ReachInbox: sender #${email.sender_id} hit its hourly limit (${limit}/hr). Remaining emails were rescheduled to ${new Date(wakeAt).toISOString()}.`
//           );
//         }

//         await job.moveToDelayed(wakeAt, token);
//         throw new DelayedError();
//       }

//       // 5. Get sender details.
//       const { rows: senderRows } = await pool.query(
//         "SELECT * FROM senders WHERE id=$1",
//         [email.sender_id]
//       );

//       if (!senderRows.length) {
//         await markFinal(emailId, "failed", {
//           error: "Sender not found",
//         });

//         return { failed: true };
//       }

//       const sender = senderRows[0] as Sender;

//       // 6. Send the email.
//       try {
//         const previewUrl = await sendMail(
//           sender,
//           email.to_email,
//           email.subject,
//           email.body
//         );

//         await markFinal(emailId, "sent", { previewUrl });

//         console.log(`[worker] Email sent: ${emailId}`);

//         return { sent: true };
//       } catch (err) {
//         const msg =
//           err instanceof Error ? err.message : String(err);

//         const isLast =
//           job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

//         if (isLast) {
//           await markFinal(emailId, "failed", { error: msg });
//         } else {
//           await pool.query(
//             `UPDATE emails
//              SET status='scheduled', claimed_at=NULL, error=$2
//              WHERE id=$1`,
//             [emailId, msg]
//           );
//         }

//         throw err;
//       }
//     },
//     {
//       connection: redis,
//       concurrency: config.workerConcurrency,

//       // At most one email send per configured interval globally.
//       limiter: {
//         max: 1,
//         duration: config.minDelayMs,
//       },
//     }
//   );

//   worker.on("failed", (job, err) => {
//     console.warn(
//       `[worker] job ${job?.id} failed: ${err.message}`
//     );
//   });

//   worker.on("error", (err) => {
//     console.error("[worker] error:", err);
//   });

//   return worker;
// }

// // Run standalone: npm run dev:worker
// if (process.argv[1]?.includes("worker")) {
//   (async () => {
//     await initDb();
//     await initSearch();
//     startWorker();

//     console.log(
//       `[worker] started concurrency=${config.workerConcurrency} minDelay=${config.minDelayMs}ms`
//     );
//   })();
// }
