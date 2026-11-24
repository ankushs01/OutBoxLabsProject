import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { pool } from "./db.js";

export interface AuthedRequest extends Request {
  userId?: number;
}

const COOKIE = "session";

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[COOKIE];
    const payload = jwt.verify(token, config.jwtSecret) as { uid: number };
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
}

const redirectUri = `${config.backendUrl}/auth/google/callback`;
export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get("/google/callback", async (req, res) => {
  try {
    const code = String(req.query.code ?? "");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error("token exchange failed");
    const info = (await (
      await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
    ).json()) as { sub: string; email: string; name: string; picture?: string };

    const { rows } = await pool.query(
      `INSERT INTO users(google_id,email,name,avatar) VALUES ($1,$2,$3,$4)
       ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
       RETURNING id`,
      [info.sub, info.email, info.name, info.picture ?? null]
    );
    const token = jwt.sign({ uid: rows[0].id }, config.jwtSecret, { expiresIn: "7d" });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600_000 });
    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (e) {
    console.error("[auth]", e);
    res.redirect(`${config.frontendUrl}/?error=login_failed`);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});
