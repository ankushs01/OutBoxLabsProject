import { Redis } from "ioredis";
import { config } from "./config.js";

// BullMQ requires maxRetriesPerRequest: null for blocking connections.
export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
