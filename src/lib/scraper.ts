import * as cheerio from 'cheerio';
import { env } from './env';
import { addScrapeRecord, type ScrapeRecord } from './kv';

export async function runScrapeOnce(): Promise<ScrapeRecord> {
  if (!env.SCRAPER_TARGET_URL) {
    throw new Error('SCRAPER_TARGET_URL is not set');
  }

  const start = Date.now();
  const res = await fetch(env.SCRAPER_TARGET_URL, {
    headers: { 'user-agent': 'PersonalToolboxBot/1.0 (+https://vercel.com)' },
    cache: 'no-store',
    next: { revalidate: 0 }
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);

  const record: ScrapeRecord = {
    id: String(start),
    ok: res.ok,
    url: env.SCRAPER_TARGET_URL,
    status: res.status,
    extractedText: text,
    createdAt: new Date().toISOString()
  };

  await addScrapeRecord(record);

  if (res.ok && env.WEBHOOK_URL) {
    try {
      await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'scrape.success',
          url: env.SCRAPER_TARGET_URL,
          status: res.status,
          createdAt: record.createdAt
        })
      });
    } catch {
      // ignore webhook errors
    }
  }

  return record;
}

