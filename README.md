# 个人工具箱 (Vercel 一键部署)

本仓库是一个可在 Vercel 免费版上运行的个人工具集合。已内置：

- 定时抓取器：按计划抓取网页内容，保存到 Vercel KV，并在成功时调用 Webhook。
- 首页工具索引：自动展示所有工具入口。

## 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmonkeyzcc%2Fmy-personal-serve&project-name=personal-toolbox&repository-name=personal-toolbox&env=SCRAPER_TARGET_URL,WEBHOOK_URL)

1. Fork 或导入本仓库到你的 Git 平台（或直接点击上面的按钮）
2. 在 Vercel 导入项目，框架选择 Next.js，Node 18+
3. 在 Vercel → Integrations 启用 Vercel KV，并把以下环境变量填好（见下文「Vercel KV 配置」）：
   - SCRAPER_TARGET_URL（例如 `https://www.theblockbeats.info/dataview`）
   - WEBHOOK_URL (可选)
4. 部署后，Vercel 会根据 `vercel.json` 的 `crons` 每天调用一次 `/api/tools/scraper/run`

## 本地开发

```bash
pnpm i # 或 npm i / yarn
pnpm dev
```

## 环境变量

参见 `.env.example`。

## Vercel KV 配置

Vercel KV 基于 Upstash Redis 提供 KV 能力。本项目使用 `@vercel/kv` 进行读写。按以下步骤完成配置：

1. 在 Vercel 项目中打开 Integrations，安装并启用「Vercel KV」。
2. 创建一个新的 KV 数据库或选择已有的数据库，绑定到当前项目与对应的环境（Production / Preview / Development）。
3. 启用后，Vercel 会自动在你的项目中注入以下环境变量：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`（可选）
   - `KV_URL`（Node.js 直连用；本项目默认通过 REST 使用，可不填）
4. 在项目的 Environment Variables 中确认上述变量已存在（不同环境需分别配置）。
5. 重新部署项目，使新环境变量生效。

本项目关于 KV 的实现位于：

- `src/lib/kv.ts`：封装 `@vercel/kv` 的读写逻辑，会根据 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 判断是否已配置。
- `src/app/api/tools/scraper/*`：抓取器会把结果写入 KV 并提供查询接口。

常见问题：

- 若未配置 KV 或变量缺失，相关功能会自动跳过写入，避免运行时错误；请检查 Integrations 与环境变量是否齐全。
- 免费额度有限，若频率高请在 Upstash 控制台或 Vercel 账单中确认配额。

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