import { kv } from '@vercel/kv';
import Redis from 'ioredis';
import { env } from './env';

const isVercelKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const directRedisUrl = env.REDIS_URL || env.KV_URL;

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!directRedisUrl) return null;
  if (redisClient) return redisClient;
  redisClient = new Redis(directRedisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false
  });
  return redisClient;
}

export type ScrapeRecord = {
  id: string;
  ok: boolean;
  url: string;
  status: number;
  extractedText: string;
  createdAt: string;
};

const SCRAPE_LATEST_KEY = 'scraper:latest';
let memoryLatest: ScrapeRecord | null = null;

export async function setLatestScrapeRecord(record: ScrapeRecord): Promise<void> {
  const payload = JSON.stringify(record);

  // Prefer direct Redis if available
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(SCRAPE_LATEST_KEY, payload);
      return;
    } catch (_) {
      // fall through to other backends
    }
  }

  // Fallback to Vercel KV (REST)
  if (isVercelKvConfigured) {
    await kv.set(SCRAPE_LATEST_KEY, payload);
    return;
  }

  // Last resort: in-memory (non-persistent)
  memoryLatest = record;
}

export async function getLatestScrapeRecord(): Promise<ScrapeRecord | null> {
  // Prefer direct Redis if available
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(SCRAPE_LATEST_KEY);
      return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
    } catch (_) {
      // fall through to other backends
    }
  }

  // Fallback to Vercel KV (REST)
  if (isVercelKvConfigured) {
    const raw = await kv.get<string | null>(SCRAPE_LATEST_KEY);
    return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
  }

  // Last resort: in-memory (non-persistent)
  return memoryLatest;
}

