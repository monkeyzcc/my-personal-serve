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
    cache: 'no-store'
  });

  const html = await res.text();
  const $ = cheerio.load(html);
  // Prefer extracting the specific target: div.macd-wrap under https://www.theblockbeats.info/dataview
  // Fallback to body text when the target container is not present (e.g., client-rendered pages).
  const target = $('div.macd-wrap').first();
  const root = target.length ? target : $('body').first();

  // Convert HTML to plain text while preserving paragraph/line breaks.
  const $clone = root.clone();
  $clone.find('br').replaceWith('\n');
  $clone
    .find(
      'p,div,li,ul,ol,h1,h2,h3,h4,h5,h6,tr,th,td,section,article,header,footer,aside,nav,blockquote,pre'
    )
    .each((_, el) => {
      const node = $(el);
      const t = node.text();
      node.text(t + '\n');
    });

  const raw = $clone.text();
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

  const text = normalized.slice(0, 5000);

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
          createdAt: record.createdAt,
          content: text
        })
      });
    } catch {
      // ignore webhook errors
    }
  }

  return record;
}

