import { kv } from '@vercel/kv';

const isKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

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
  if (!isKvConfigured) {
    memoryLatest = record;
    return;
  }
  await kv.set(SCRAPE_LATEST_KEY, JSON.stringify(record));
}

export async function getLatestScrapeRecord(): Promise<ScrapeRecord | null> {
  if (!isKvConfigured) {
    return memoryLatest;
  }
  const raw = await kv.get<string | null>(SCRAPE_LATEST_KEY);
  return raw ? (JSON.parse(raw) as ScrapeRecord) : null;
}

