import { NextResponse } from 'next/server';
import { getLatestScrapeRecord } from '@/lib/kv';

export const runtime = 'nodejs';

export async function GET() {
  const latest = await getLatestScrapeRecord();
  return NextResponse.json({ ok: true, latest });
}

