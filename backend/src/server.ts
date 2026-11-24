import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { config } from "./config.js";
import { initDb, pool } from "./db.js";
import { authRouter } from "./auth.js";
import { apiRouter } from "./routes.js";
import { emailQueue, jobFor } from "./queue.js";
import { ensureSenders } from "./mailer.js";
import { initSearch } from "./search.js";
import { startWorker } from "./worker.js";

async function reconcile() {
  // Safety net after restarts / Redis data loss: re-enqueue any DB email still 'scheduled'.
  // jobId == email id, so jobs already in Redis are not duplicated.
  const { rows } = await pool.query("SELECT id, scheduled_at FROM emails WHERE status IN ('scheduled','sending')");
  if (rows.length) await emailQueue.addBulk(rows.map((r) => jobFor(r.id, r.scheduled_at)));
  console.log(`[reconcile] ensured ${rows.length} pending emails are queued`);
}

async function main() {
  await initDb();
  await initSearch();
  await ensureSenders();
  await reconcile();

  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
  app.use("/admin/queues", serverAdapter.getRouter());

  app.use("/auth", authRouter);
  app.use("/api", apiRouter);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  });

  app.listen(config.port, () => console.log(`[api] http://localhost:${config.port}  (Bull Board: /admin/queues)`));

  // Optional: run worker in the same process (WORKER_IN_API=true) for single-process dev.
  if (process.env.WORKER_IN_API === "true") startWorker();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
