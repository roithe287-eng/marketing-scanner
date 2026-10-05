import {scopedSignal} from './runtime/budget';
import { Redis } from "@upstash/redis";

type RedisConfig = { url: string; token: string };
let client: Redis | null = null;
let currentConfig: RedisConfig | null = null;

/** Keep each provider's URL/token together; never combine two partial pairs. */
export function getRedisConfig(): RedisConfig | null {
  for (const [rawUrl, rawToken] of [
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
  ]) {
    const url = rawUrl?.trim();
    const token = rawToken?.trim();
    if (url && token) return { url, token };
  }
  return null;
}

export function getRedisClient(): Redis | null {
  const config = getRedisConfig();
  if (!config) return null;
  if (client && currentConfig?.url === config.url && currentConfig.token === config.token) {
    return client;
  }
  try {
    client = new Redis({...config,retry:false,signal:()=>scopedSignal(AbortSignal.timeout(5000))!});
    currentConfig = config;
    return client;
  } catch {
    console.warn("[redis] Redis 설정을 확인해주세요.");
    return null;
  }
}
