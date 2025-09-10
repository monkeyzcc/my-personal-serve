import { getLatestScrapeRecord } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export default async function ScraperPage() {
  const latest = await getLatestScrapeRecord();
  return (
    <div>
      <h2>定时抓取器</h2>
      <p className="muted">展示最近一次抓取记录。可在 Vercel 上配置 Cron 触发。</p>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <a href="/api/tools/scraper/run" target="_blank" rel="noreferrer"><button>手动触发一次</button></a>
        <a href="/api/tools/scraper/records" target="_blank" rel="noreferrer" className="muted">查看 JSON</a>
      </div>
      <div className="grid">
        {latest ? (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{new Date(latest.createdAt).toLocaleString()}</strong>
              <span className="muted">{latest.ok ? '成功' : '失败'} · {latest.status}</span>
            </div>
            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{latest.extractedText || '(无内容)'}</div>
          </div>
        ) : (
          <div className="card"><span className="muted">暂无记录</span></div>
        )}
      </div>
    </div>
  );
}

