# 个人工具箱 (Vercel 一键部署)

本仓库是一个可在 Vercel 免费版上运行的个人工具集合。已内置：

- 定时抓取器：按计划抓取网页内容，保存到 Vercel KV，并在成功时调用 Webhook。
- 首页工具索引：自动展示所有工具入口。

## 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmonkeyzcc%2Fmy-personal-serve&project-name=personal-toolbox&repository-name=personal-toolbox&env=SCRAPER_TARGET_URL,WEBHOOK_URL)

1. Fork 或导入本仓库到你的 Git 平台（或直接点击上面的按钮）
2. 在 Vercel 导入项目，框架选择 Next.js，Node 18+
3. 在 Vercel → Integrations 启用 Vercel KV，并把以下环境变量填好：
   - SCRAPER_TARGET_URL（例如 `https://www.theblockbeats.info/dataview`）
   - WEBHOOK_URL (可选)
4. 部署后，Vercel 会根据 `vercel.json` 的 `crons` 每小时调用 `/api/tools/scraper/run`

## 本地开发

```bash
pnpm i # 或 npm i / yarn
pnpm dev
```

## 环境变量

参见 `.env.example`。

## 目录结构

- `src/app` 应用入口、页面与 API Routes
- `src/lib` 通用库（env、kv、scraper、tools 列表）

## API

- `GET /api/tools/scraper/run` 触发一次抓取并写入 KV，成功时发 Webhook
- `GET /api/tools/scraper/records` 获取最近记录

## 自定义与扩展

- 在 `src/lib/tools.ts` 中注册新的工具项
- 在 `src/app/tools/<your-tool>/page.tsx` 中实现你的工具 UI
- 若需要更多计划任务，可在 `vercel.json` 中添加 `crons` 项