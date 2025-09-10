import type { Route } from 'next';

export type Tool = {
  slug: string;
  title: string;
  description: string;
  href: Route;
  docsHref?: string;
};

export const allTools: Tool[] = [
  {
    slug: 'scheduled-scraper',
    title: '定时抓取器 + Webhook 通知',
    description: '定时抓取网页内容，存储并在页面展示，成功后调用 Webhook 通知',
    href: '/tools/scraper' as Route,
    docsHref: 'https://vercel.com/docs/cron-jobs'
  }
];

