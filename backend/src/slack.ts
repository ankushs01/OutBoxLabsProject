import { pool } from "./db.js";

/** Post to the user's connected Slack. No-op (never throws) if not connected. */
export async function notifySlack(userId: number, text: string) {
  try {
    const { rows } = await pool.query("SELECT webhook_url FROM slack_connections WHERE user_id=$1", [userId]);
    if (!rows.length) return false;
    const res = await fetch(rows[0].webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.warn("[slack] webhook returned", res.status);
    return res.ok;
  } catch (e) {
    console.warn("[slack] notify failed:", (e as Error).message);
    return false;
  }
}
