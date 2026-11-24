import { Router } from "express";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "./config.js";
import { pool } from "./db.js";
import { requireAuth, AuthedRequest } from "./auth.js";
import { emailQueue, jobFor } from "./queue.js";
import { bulkIndex, searchEmails } from "./search.js";

export const apiRouter = Router();

// Slack OAuth callback is hit by Slack's redirect; it carries a signed `state` instead of a cookie check.
apiRouter.get("/slack/callback", async (req, res) => {
  try {
    const { uid } = jwt.verify(String(req.query.state), config.jwtSecret) as { uid: number };
    const r = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        redirect_uri: `${config.backendUrl}/api/slack/callback`,
      }),
    });
    const data = (await r.json()) as any;
    if (!data.ok || !data.incoming_webhook) throw new Error(data.error ?? "no incoming webhook");
    await pool.query(
      `INSERT INTO slack_connections(user_id, team_name, channel, webhook_url, access_token)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET team_name=EXCLUDED.team_name, channel=EXCLUDED.channel,
         webhook_url=EXCLUDED.webhook_url, access_token=EXCLUDED.access_token, connected_at=now()`,
      [uid, data.team?.name, data.incoming_webhook.channel, data.incoming_webhook.url, data.access_token]
    );
    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
  } catch (e) {
    console.error("[slack]", e);
    res.redirect(`${config.frontendUrl}/dashboard?slack=error`);
  }
});

apiRouter.use(requireAuth);

apiRouter.get("/me", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query("SELECT id,email,name,avatar FROM users WHERE id=$1", [req.userId]);
  if (!rows.length) return res.status(401).json({ error: "Unknown user" });
  res.json(rows[0]);
});

// --- Slack connect / status / disconnect ---
apiRouter.get("/slack/connect", (req: AuthedRequest, res) => {
  const state = jwt.sign({ uid: req.userId }, config.jwtSecret, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: "incoming-webhook",
    redirect_uri: `${config.backendUrl}/api/slack/callback`,
    state,
  });
  res.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
});

apiRouter.get("/slack/status", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query("SELECT team_name, channel FROM slack_connections WHERE user_id=$1", [req.userId]);
  res.json({ connected: rows.length > 0, ...(rows[0] ?? {}) });
});

apiRouter.delete("/slack", async (req: AuthedRequest, res) => {
  await pool.query("DELETE FROM slack_connections WHERE user_id=$1", [req.userId]);
  res.json({ ok: true });
});

// --- Scheduling ---
const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1).max(20000),
  startTime: z.string().datetime(),
  delaySeconds: z.number().min(0).default(0),
  hourlyLimit: z.number().int().min(1).optional(),
  senderId: z.number().int().optional(),
});

apiRouter.post("/schedule", async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { subject, body, recipients, startTime, delaySeconds, hourlyLimit, senderId } = parsed.data;

  const { rows: allSenders } = await pool.query("SELECT id FROM senders ORDER BY id");
  // A chosen sender sends everything; otherwise rotate across all senders.
  const senders = senderId ? allSenders.filter((x) => x.id === senderId) : allSenders;
  if (!senders.length) return res.status(400).json({ error: senderId ? "Unknown sender" : "No senders configured" });

  const base = new Date(startTime).getTime();
  const unique = [...new Set(recipients.map((r) => r.toLowerCase()))];
  const rowsToInsert = unique.map((to, i) => ({
    id: randomUUID(),
    sender_id: senders[i % senders.length].id, // round-robin across senders
    to,
    scheduled_at: new Date(base + i * delaySeconds * 1000),
  }));

  // 1) Persist in Postgres (source of truth), 2) enqueue delayed jobs in BullMQ.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of rowsToInsert) {
      await client.query(
        `INSERT INTO emails(id,user_id,sender_id,to_email,subject,body,scheduled_at,hourly_limit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.id, req.userId, r.sender_id, r.to, subject, body, r.scheduled_at, hourlyLimit ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await emailQueue.addBulk(rowsToInsert.map((r) => jobFor(r.id, r.scheduled_at)));
  await bulkIndex(
    rowsToInsert.map((r) => ({
      id: r.id, userId: req.userId!, to: r.to, subject, body, status: "scheduled", scheduledAt: r.scheduled_at,
    }))
  );
  res.status(201).json({ scheduled: rowsToInsert.length });
});

// --- Listing ---
const listQuery = (statuses: string[]) => async (req: AuthedRequest, res: any) => {
  const order = statuses.includes("scheduled") ? "e.scheduled_at ASC" : "e.sent_at DESC";
  const { rows } = await pool.query(
    `SELECT e.id, e.to_email AS "to", e.subject, e.body, s.email AS "fromEmail",
            e.scheduled_at AS "scheduledAt", e.sent_at AS "sentAt",
            CASE WHEN e.status='sending' THEN 'scheduled' ELSE e.status END AS status,
            e.preview_url AS "previewUrl", e.error
     FROM emails e JOIN senders s ON s.id = e.sender_id
     WHERE e.user_id=$1 AND e.status = ANY($2) ORDER BY ${order} LIMIT 500`,
    [req.userId, statuses]
  );
  res.json(rows);
};
apiRouter.get("/emails/scheduled", listQuery(["scheduled", "sending"]));
apiRouter.get("/emails/sent", listQuery(["sent", "failed"]));

apiRouter.get("/emails/search", async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);
  try {
    res.json(await searchEmails(req.userId!, q));
  } catch {
    res.status(503).json({ error: "Search unavailable" });
  }
});

apiRouter.get("/emails/counts", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT count(*) FILTER (WHERE status IN ('scheduled','sending'))::int AS scheduled,
            count(*) FILTER (WHERE status IN ('sent','failed'))::int AS sent
     FROM emails WHERE user_id=$1`,
    [req.userId]
  );
  res.json(rows[0]);
});

apiRouter.get("/senders", async (_req, res) => {
  const { rows } = await pool.query("SELECT id, email FROM senders ORDER BY id");
  res.json(rows);
});
