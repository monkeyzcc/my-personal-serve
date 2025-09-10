import { NextResponse } from 'next/server';
import { getRecentScrapeRecords } from '@/lib/kv';

export const runtime = 'nodejs';

export async function GET() {
  const list = await getRecentScrapeRecords(50);
  return NextResponse.json({ ok: true, list });
}

