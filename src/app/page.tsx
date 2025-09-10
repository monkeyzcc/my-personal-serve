import Link from 'next/link';
import { allTools } from '@/lib/tools';

export default function HomePage() {
  return (
    <div>
      <header>
        <h1>我的工具箱</h1>
        <span className="muted">一键部署到 Vercel · 免费版可用能力封装</span>
      </header>

      <div className="grid">
        {allTools.map(tool => (
          <div key={tool.slug} className="card">
            <h3 style={{ marginTop: 0 }}>{tool.title}</h3>
            <p className="muted" style={{ minHeight: 44 }}>{tool.description}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={tool.href}><button>打开</button></Link>
              {tool.docsHref && (
                <a href={tool.docsHref} target="_blank" rel="noreferrer" className="muted">文档</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

