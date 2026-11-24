import nodemailer, { type Transporter } from "nodemailer";
import { pool } from "./db.js";
import { config } from "./config.js";

export interface Sender {
  id: number;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

interface EtherealAccount {
  user: string;
  pass: string;
  smtp: { host: string; port: number };
}

/** Ask Ethereal's API directly for a brand-new account (nodemailer's helper can hand back the same one). */
async function createEtherealAccount(): Promise<EtherealAccount> {
  const res = await fetch("https://api.nodemailer.com/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestor: "reachinbox-scheduler", version: "1.0.0" }),
  });
  const data = (await res.json()) as { status?: string; user?: string; pass?: string; smtp?: { host: string; port: number } };
  if (!res.ok || data.status !== "success" || !data.user || !data.pass || !data.smtp) {
    throw new Error(`Ethereal account creation failed (${res.status})`);
  }
  return { user: data.user, pass: data.pass, smtp: data.smtp };
}

/** Create Ethereal accounts on first boot and persist them, so senders survive restarts. */
export async function ensureSenders() {
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM senders")).rows[0].n as number;
  let attempts = 0;
  while ((await count()) < config.senderCount && attempts++ < config.senderCount * 3) {
    const acc = await createEtherealAccount();
    const res = await pool.query(
      `INSERT INTO senders(email, smtp_host, smtp_port, smtp_user, smtp_pass) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`,
      [acc.user, acc.smtp.host, acc.smtp.port, acc.user, acc.pass]
    );
    if (res.rowCount) console.log(`[mailer] created Ethereal sender ${acc.user}`);
  }
  if ((await count()) === 0) throw new Error("No Ethereal senders available");
}

const transports = new Map<number, Transporter>();
function transportFor(s: Sender) {
  let t = transports.get(s.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: s.smtp_host,
      port: s.smtp_port,
      secure: false,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
    transports.set(s.id, t);
  }
  return t;
}

const htmlToText = (html: string) =>
  html
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

/** Body is HTML from the rich-text editor; a plain-text alternative is sent alongside it. */
export async function sendMail(s: Sender, to: string, subject: string, body: string) {
  const info = await transportFor(s).sendMail({ from: s.email, to, subject, html: body, text: htmlToText(body) });
  return nodemailer.getTestMessageUrl(info) || null;
}
