import { kv as vercelKv } from '@vercel/kv';
import { env } from './env';

const isRestKvConfigured = Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
const directRedisUrl = env.REDIS_URL || env.KV_URL;

let directRedisClient: any | null = null;

async function getDirectRedis() {
  if (!directRedisUrl) return null;
  if (directRedisClient) return directRedisClient;
  const { default: IORedis } = await import('ioredis');
  directRedisClient = new IORedis(directRedisUrl);
  return directRedisClient;
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
  // Prefer direct Redis if REDIS_URL / KV_URL is provided
  const direct = await getDirectRedis();
  if (direct) {
    await direct.set(SCRAPE_LATEST_KEY, JSON.stringify(record));
    return;
  }
  if (!isRestKvConfigured) {
    memoryLatest = record;
    return;
  }
  await vercelKv.set(SCRAPE_LATEST_KEY, JSON.stringify(record));
}

export async function getLatestScrapeRecord(): Promise<ScrapeRecord | null> {
  const direct = await getDirectRedis();
  if (direct) {
    const raw = await direct.get(SCRAPE_LATEST_KEY);
    return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
  }
  if (!isRestKvConfigured) {
    return memoryLatest;
  }
  const raw = await vercelKv.get<string | null>(SCRAPE_LATEST_KEY);
  return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
}

