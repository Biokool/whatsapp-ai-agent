import Redis from "ioredis";
import { getEnv } from "@/config/environment";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const env = getEnv();
  _redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  _redis.on("error", (err) => {
    console.error("[Redis] connection error:", err.message);
  });

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
