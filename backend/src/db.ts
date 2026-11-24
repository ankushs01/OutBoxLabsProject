import { Pool } from "pg";
import { config } from "./config.js";

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS senders (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      smtp_host TEXT NOT NULL,
      smtp_port INT NOT NULL,
      smtp_user TEXT NOT NULL,
      smtp_pass TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      sender_id INT NOT NULL REFERENCES senders(id),
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      hourly_limit INT,
      status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | sending | sent | failed
      claimed_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      error TEXT,
      preview_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS emails_user_status ON emails(user_id, status);
    CREATE TABLE IF NOT EXISTS slack_connections (
      user_id INT PRIMARY KEY REFERENCES users(id),
      team_name TEXT,
      channel TEXT,
      webhook_url TEXT NOT NULL,
      access_token TEXT,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
