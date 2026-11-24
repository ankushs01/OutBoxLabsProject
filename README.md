# ReachInbox Email Job Scheduler  

Full-stack email scheduler: Express + BullMQ (Redis) + Postgres + Elasticsearch backend, React + Vite + Tailwind dashboard.

## Quick start

```bash
# 1. Infra (Postgres, Redis, Elasticsearch)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # fill in Google + Slack credentials (see below)
npm install
npm run dev:api             # API + Bull Board  -> http://localhost:4000
npm run dev:worker          # BullMQ worker (run in a second terminal)
# Single-process alternative: WORKER_IN_API=true npm run dev:api

# 3. Frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5173
```

Live queue dashboard (Bull Board): `http://localhost:4000/admin/queues`

### Environment variables (`backend/.env`)

| Var | Purpose |
| --- | --- |
| `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_URL` | Infra connections |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth. Authorized redirect URI: `http://localhost:4000/auth/google/callback` |
| `SLACK_CLIENT_ID/SECRET` | Slack app with scope `incoming-webhook`. Redirect URL: `http://localhost:4000/api/slack/callback` |
| `WORKER_CONCURRENCY` | Parallel jobs per worker (default 5) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Min gap between sends, global across workers (default **2000 ms**) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Default hourly cap per sender (default 200); overridable per campaign from the Compose form |
| `SENDER_COUNT` | Number of Ethereal sender accounts (default 3) |

### Ethereal Email

No manual setup. On first boot the API calls `nodemailer.createTestAccount()` `SENDER_COUNT` times and stores the credentials in the `senders` table (so they survive restarts). Each sent email stores an Ethereal preview URL (`emails.preview_url`) you can open to view the message.

## Architecture

**Scheduling.** `POST /api/schedule` stores every recipient as a row in Postgres (`status=scheduled`), assigns senders round-robin, then enqueues one BullMQ **delayed job** per email with `delay = scheduled_at - now` and `jobId = email.id`. Email *i* is scheduled at `startTime + i * delay`. No cron anywhere.

**Persistence on restart.** Jobs live in Redis (AOF enabled in `docker-compose.yml`); email state lives in Postgres. Stopping/starting the API or worker loses nothing: delayed jobs fire at their original time. On API boot a `reconcile()` step re-adds any DB email still `scheduled`; because `jobId == email.id`, BullMQ ignores jobs that already exist, so this is a safe self-heal if Redis data was lost.

**Idempotency (no duplicate sends).**
1. Deterministic `jobId` prevents duplicate jobs for one email.
2. The worker first runs an atomic `UPDATE ... SET status='sending' WHERE id=$1 AND status='scheduled'`. If no row is returned (already sent / in flight), it skips. A claim older than 5 min is treated as a crashed worker and can be re-claimed.

**Concurrency.** `Worker({ concurrency: WORKER_CONCURRENCY })`. Parallel safety comes from the atomic DB claim and the atomic Redis counter below.

**Min delay between sends.** BullMQ `limiter: { max: 1, duration: MIN_DELAY_BETWEEN_EMAILS_MS }` (Redis-backed, so it is global across all workers/instances). Default: **min 2 seconds between sends**.

**Hourly rate limit (per sender).** A Redis Lua script atomically does `INCR rl:{sender}:{hourWindow}`; if the result exceeds the limit it `DECR`s and refuses. This is safe across any number of workers. When refused, the job is **not failed or dropped**: the claim is released and the job is moved to the *next hour window* via `job.moveToDelayed(nextHourStart + rank)`, where `rank` is a Redis overflow counter (+1 ms per overflowing job), preserving order as much as possible.

**Behavior under load (1000+ at once).** All jobs sit in Redis; at most `concurrency` run at once, and the limiter admits 1 send / 2 s. Each sender sends up to its hourly cap in the current hour; the surplus is pushed to the next hour in order, repeating until drained. Nothing is lost.

**Slack on limit hit.** Dashboard "Connect Slack" runs the real Slack OAuth v2 flow (`incoming-webhook` scope); the webhook URL is stored per user in `slack_connections`. The first time a sender hits its cap in an hour, the worker POSTs a real message to that webhook (one alert per sender per window to avoid spam). If the user is not connected, the notification is skipped silently; connecting later works immediately (the connection is read from the DB at hit time), and "Disconnect" removes it.

**Elasticsearch.** Emails are indexed on schedule and re-indexed when sent/failed. `GET /api/emails/search?q=...` does a fuzzy multi-field search scoped to the user. Indexing is best-effort; Postgres is the source of truth.

## Features

**Backend:** schedule API, Postgres storage, BullMQ delayed jobs, restart persistence + reconcile, idempotent sends, configurable worker concurrency, global min delay, Redis-backed per-sender hourly limit with rollover, multiple Ethereal senders, Slack OAuth + live notification, Elasticsearch indexing/search, Bull Board at `/admin/queues`, Google OAuth with JWT cookie session.

**Frontend:** Google login, header with name/email/avatar + logout, Scheduled/Sent tabs (polling every 5 s, loading + empty + error states), Compose modal (subject, body, CSV/text upload with detected-count, start time, delay, hourly limit), Connect/Disconnect Slack, toasts, reusable UI components (Button, Input, Modal, DataTable, Toast).

## Assumptions, shortcuts and trade-offs

- **No Figma file was provided**, so the UI follows the spec's layout with clean Tailwind styling, not a pixel match. Adjust to the design before submitting.
- Hourly limit entered in the Compose form is stored per email and overrides the env default for that campaign's emails.
- The limiter counts attempted sends (a failed SMTP attempt still consumes a slot): conservative by design.
- Bull Board is unauthenticated for demo simplicity; protect it before any real deployment.
- Slack alerts use an incoming webhook (simplest per-user OAuth result) rather than `chat.postMessage`.
- No automated tests; verified via typecheck and build only.
