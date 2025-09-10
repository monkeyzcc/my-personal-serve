import { getRecentScrapeRecords } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export default async function ScraperPage() {
  const records = await getRecentScrapeRecords(20);
  return (
    <div>
      <h2>定时抓取器</h2>
      <p className="muted">展示最近抓取的记录。可在 Vercel 上配置 Cron 触发。</p>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <a href="/api/tools/scraper/run" target="_blank" rel="noreferrer"><button>手动触发一次</button></a>
        <a href="/api/tools/scraper/records" target="_blank" rel="noreferrer" className="muted">查看 JSON</a>
      </div>
      <div className="grid">
        {records.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{new Date(r.createdAt).toLocaleString()}</strong>
              <span className="muted">{r.ok ? '成功' : '失败'} · {r.status}</span>
            </div>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.extractedText || '(无内容)'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

