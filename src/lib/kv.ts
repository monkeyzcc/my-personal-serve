import { kv } from '@vercel/kv';
import Redis from 'ioredis';
import { env } from './env';

const isVercelKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const directRedisUrl = env.REDIS_URL || env.KV_URL;

let redisClient: Redis | null = null;

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

function getRedisClient(): Redis | null {
  if (!directRedisUrl) {
    console.log('[kv] redis disabled: missing REDIS_URL/KV_URL');
    return null;
  }
  if (redisClient) return redisClient;
  console.log('[kv] init ioredis', maskRedisUrl(directRedisUrl));
  redisClient = new Redis(directRedisUrl, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: true
  });
  redisClient.on('connect', () => console.log('[kv] redis connect', maskRedisUrl(directRedisUrl)));
  redisClient.on('ready', () => console.log('[kv] redis ready', maskRedisUrl(directRedisUrl)));
  redisClient.on('end', () => console.log('[kv] redis end', maskRedisUrl(directRedisUrl)));
  redisClient.on('reconnecting', (delay: number) => console.log('[kv] redis reconnecting in', delay, 'ms'));
  redisClient.on('error', (e: Error) => console.warn('[kv] redis error', (e as Error).message));
  return redisClient;
}

async function ensureRedisReady(client: Redis): Promise<void> {
  if (client.status === 'ready') return;
  const waitForReady = () =>
    new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (e: Error) => {
        cleanup();
        reject(e);
      };
      const cleanup = () => {
        client.off('ready', onReady);
        client.off('error', onError);
      };
      client.once('ready', onReady);
      client.once('error', onError);
    });
  if (client.status === 'wait') {
    // Lazy client hasn't connected yet
    try {
      await client.connect();
    } catch (e) {
      // connect() may fail; wait for error/ready handlers to settle
    }
  }
  if (client.status !== 'ready') {
    await waitForReady();
  }
}

async function withRedisRetry<T>(
  client: Redis,
  action: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 50;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await ensureRedisReady(client);
      return await action();
    } catch (e) {
      lastErr = e;
      const msg = (e as Error)?.message || '';
      const isStreamNotWriteable = msg.includes("Stream isn't writeable") || msg.includes('writeable');
      const isCommandQueueError = msg.includes('enableOfflineQueue options is false');
      const shouldRetry = isStreamNotWriteable || isCommandQueueError || client.status !== 'ready';
      if (i < attempts - 1 && shouldRetry) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastErr as Error;
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
      const t0 = Date.now();
      console.log('[kv] set via redis', SCRAPE_LATEST_KEY, 'bytes', payload.length);
      await withRedisRetry(redis, () => redis.set(SCRAPE_LATEST_KEY, payload));
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
      const t0 = Date.now();
      console.log('[kv] get via redis', SCRAPE_LATEST_KEY);
      const raw = await withRedisRetry(redis, () => redis.get(SCRAPE_LATEST_KEY));
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

