import { kv } from '@vercel/kv';

const isKvConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export type ScrapeRecord = {
  id: string; // timestamp id
  ok: boolean;
  url: string;
  status: number;
  extractedText: string;
  createdAt: string; // ISO
};

const SCRAPE_LIST_KEY = 'scraper:records';
const memoryStore: ScrapeRecord[] = [];

export async function addScrapeRecord(record: ScrapeRecord): Promise<void> {
  if (!isKvConfigured) {
    memoryStore.unshift(record);
    if (memoryStore.length > 200) memoryStore.length = 200;
    return;
  }
  await kv.lpush(SCRAPE_LIST_KEY, JSON.stringify(record));
  await kv.ltrim(SCRAPE_LIST_KEY, 0, 199); // keep latest 200
}

export async function getRecentScrapeRecords(limit = 20): Promise<ScrapeRecord[]> {
  if (!isKvConfigured) {
    return memoryStore.slice(0, limit);
  }
  const raw = await kv.lrange<string>(SCRAPE_LIST_KEY, 0, limit - 1);
  return raw.map((s) => JSON.parse(s) as ScrapeRecord);
}

