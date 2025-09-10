import * as cheerio from 'cheerio';
import { env } from './env';
import { setLatestScrapeRecord, type ScrapeRecord } from './kv';

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

  await setLatestScrapeRecord(record);

  if (res.ok && env.WEBHOOK_URL) {
    try {
      const payload: Record<string, unknown> = {
        msg_type: 'text',
        content: { text: record.extractedText }
      };
      if (env.FEISHU_WEBHOOK_SECRET) {
        const ts = Math.floor(Date.now() / 1000);
        const signBase = `${ts}\n${env.FEISHU_WEBHOOK_SECRET}`;
        const crypto = await import('node:crypto');
        const hmac = crypto.createHmac('sha256', env.FEISHU_WEBHOOK_SECRET).update(signBase).digest('base64');
        (payload as any).timestamp = String(ts);
        (payload as any).sign = hmac;
      }
      const hookRes = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!hookRes.ok) {
        const errText = await hookRes.text().catch(() => '');
        console.warn('[webhook] non-200', hookRes.status, errText);
      }
    } catch (e) {
      console.warn('[webhook] send error', (e as Error).message);
    }
  }

  return record;
}

