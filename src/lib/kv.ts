import { kv } from '@vercel/kv';
import Redis from 'ioredis';
import { env } from './env';

const isVercelKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const directRedisUrl = env.REDIS_URL || env.KV_URL;

let redisClient: any | null = null;

async function waitForRedisReady(client: any, timeoutMs = 5000): Promise<void> {
  if (client.status === 'ready') return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('redis ready timeout'));
    }, timeoutMs);
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onEnd = (err?: unknown) => {
      cleanup();
      reject(new Error('redis ended before ready'));
    };
    const onError = (e: Error) => {
      // keep waiting; only reject on timeout/end
    };
    const cleanup = () => {
      clearTimeout(timer);
      client.off('ready', onReady);
      client.off('end', onEnd);
      client.off('error', onError as any);
    };
    client.once('ready', onReady);
    client.once('end', onEnd);
    client.on('error', onError as any);
  });
}

function maskRedisUrl(input: string | undefined): string {
  if (!input) return '(undefined)';
  try {
    const u = new URL(input);
    // hide username/password, keep host:port and protocol for diagnostics
    const dbPath = u.pathname && u.pathname !== '/' ? u.pathname : '';
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}${dbPath}`;
  } catch {
    return '(invalid-url)';
  }
}

function getRedisClient(): any | null {
  if (!directRedisUrl) {
    console.log('[kv] redis disabled: missing REDIS_URL/KV_URL');
    return null;
  }
  if (redisClient) return redisClient;
  console.log('[kv] init ioredis', maskRedisUrl(directRedisUrl));
  redisClient = new Redis(directRedisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true
  });
  redisClient.on('connect', () => console.log('[kv] redis connect', maskRedisUrl(directRedisUrl)));
  redisClient.on('ready', () => console.log('[kv] redis ready', maskRedisUrl(directRedisUrl)));
  redisClient.on('end', () => console.log('[kv] redis end', maskRedisUrl(directRedisUrl)));
  redisClient.on('reconnecting', (delay: number) => console.log('[kv] redis reconnecting in', delay, 'ms'));
  redisClient.on('error', (e: Error) => console.warn('[kv] redis error', (e as Error).message));
  return redisClient;
}

// Eagerly initialize on module load so the app connects at startup
if (directRedisUrl) {
  try {
    const client = getRedisClient();
    // fire and forget readiness wait for logging; do not block module load
    if (client) {
      waitForRedisReady(client, 8000).catch(() => {});
    }
  } catch {}
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
      await waitForRedisReady(redis, 4000);
      const t0 = Date.now();
      console.log('[kv] set via redis', SCRAPE_LATEST_KEY, 'bytes', payload.length);
      await redis.set(SCRAPE_LATEST_KEY, payload);
      console.log('[kv] set via redis ok in', Date.now() - t0, 'ms');
      return;
    } catch (e) {
      console.warn('[kv] set via redis failed:', (e as Error).message);
      // fall through to other backends
    }
  }

  // Fallback to Vercel KV (REST)
  if (isVercelKvConfigured) {
    const t0 = Date.now();
    console.log('[kv] set via vercel-kv', SCRAPE_LATEST_KEY, 'bytes', payload.length);
    await kv.set(SCRAPE_LATEST_KEY, payload);
    console.log('[kv] set via vercel-kv ok in', Date.now() - t0, 'ms');
    return;
  }

  // Last resort: in-memory (non-persistent)
  console.log('[kv] set via memory fallback (non-persistent)');
  memoryLatest = record;
}

export async function getLatestScrapeRecord(): Promise<ScrapeRecord | null> {
  // Prefer direct Redis if available
  const redis = getRedisClient();
  if (redis) {
    try {
      await waitForRedisReady(redis, 4000);
      const t0 = Date.now();
      console.log('[kv] get via redis', SCRAPE_LATEST_KEY);
      const raw = await redis.get(SCRAPE_LATEST_KEY);
      console.log('[kv] get via redis', raw ? 'HIT' : 'MISS', 'in', Date.now() - t0, 'ms');
      return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
    } catch (e) {
      console.warn('[kv] get via redis failed:', (e as Error).message);
      // fall through to other backends
    }
  }

  // Fallback to Vercel KV (REST)
  if (isVercelKvConfigured) {
    const t0 = Date.now();
    console.log('[kv] get via vercel-kv', SCRAPE_LATEST_KEY);
    const raw = await kv.get<string | null>(SCRAPE_LATEST_KEY);
    console.log('[kv] get via vercel-kv', raw ? 'HIT' : 'MISS', 'in', Date.now() - t0, 'ms');
    return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
  }

  // Last resort: in-memory (non-persistent)
  console.log('[kv] get via memory fallback', memoryLatest ? 'HIT' : 'MISS');
  return memoryLatest;
}

