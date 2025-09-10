import { NextResponse } from 'next/server';
import { runScrapeOnce } from '@/lib/scraper';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rec = await runScrapeOnce();
    return NextResponse.json({ ok: true, record: rec });
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

