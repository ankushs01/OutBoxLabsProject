import { redis } from "./redis.js";

const HOUR = 3600_000;
export const hourWindow = (t = Date.now()) => Math.floor(t / HOUR);
export const nextWindowStart = (t = Date.now()) => (hourWindow(t) + 1) * HOUR;

// Atomic check-and-increment: returns 1 if under limit (slot taken), 0 otherwise.
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
if c > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

export async function tryAcquireSlot(senderId: number, limit: number) {
  const key = `rl:${senderId}:${hourWindow()}`;
  return (await redis.eval(LUA, 1, key, limit)) === 1;
}

/**
 * Overflow rank in the next window. Each overflowing job gets a distinct, increasing
 * offset (1ms apart) so ordering is roughly preserved when they wake in the next hour.
 */
export async function overflowRank(senderId: number) {
  const key = `rl:overflow:${senderId}:${hourWindow() + 1}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 7200);
  return n;
}

/** True only for the first limit hit per sender per window (used to throttle Slack alerts). */
export async function firstLimitHit(senderId: number) {
  const key = `rl:notified:${senderId}:${hourWindow()}`;
  return (await redis.set(key, "1", "EX", 7200, "NX")) === "OK";
}
