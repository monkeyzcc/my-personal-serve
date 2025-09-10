export const env = {
  SCRAPER_TARGET_URL: process.env.SCRAPER_TARGET_URL ?? '',
  SCRAPER_CRON_SCHEDULE: process.env.SCRAPER_CRON_SCHEDULE ?? '0 0 * * *',
  WEBHOOK_URL: process.env.WEBHOOK_URL ?? '',
  KV_REST_API_URL: process.env.KV_REST_API_URL ?? '',
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ?? '',
  KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN ?? '',
  KV_URL: process.env.KV_URL ?? ''
};

export function assertRequiredEnv() {
  if (!env.SCRAPER_TARGET_URL) throw new Error('Missing SCRAPER_TARGET_URL');
}

