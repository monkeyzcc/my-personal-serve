import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '我的工具箱 | Toolbox',
  description: '个人工具箱合集，一键部署到 Vercel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

