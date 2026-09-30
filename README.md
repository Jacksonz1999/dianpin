# 店聘（DianPin）

面向西班牙华人的门店招聘平台。产品定位、技术栈、数据模型与约定见 [`AGENTS.md`](./AGENTS.md)（唯一事实源）。

## 本地开发

前置条件：Node.js 22、本地或可访问的 PostgreSQL 16+。

```bash
npm install
cp .env.example .env
# 编辑 .env：至少填 DATABASE_URL 和 AUTH_SECRET
#   AUTH_SECRET 生成命令：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run db:migrate   # 建表
npm run db:seed      # 灌种子数据

npm run dev          # http://localhost:3000
```

不配置 `SMTP_URL` 时，登录邮件的魔法链接会打印在服务端控制台（终端），不会真实发送，本地登录流程仍可完整走通。

不配置 `NEXT_PUBLIC_TURNSTILE_SITEKEY`/`TURNSTILE_SECRET` 时，登录页验证码走内置的明文算术题（`lib/auth/captcha.ts`）；要换成 Cloudflare Turnstile，去 [Turnstile 控制台](https://dash.cloudflare.com/?to=/:account/turnstile) 建一个 widget，把 site key / secret key 填进这两个变量即可，不需要改代码。

### 常用命令

```bash
npx tsc --noEmit     # 类型检查
npm run lint         # eslint
npm run build        # 生产构建（等价于 CI 与 Railway 构建时跑的命令）
npm start            # 以生产模式启动上一步的构建产物
npm run db:studio    # Drizzle Studio，浏览本地数据库
```

`npm run build` 后会自动执行 `postbuild`（拷贝 `public/` 与 `.next/static` 到 `.next/standalone/`），因此 `npm start` 之前不需要手动准备文件。

## 部署到 Railway

本项目用 [`railway.toml`](./railway.toml) 声明构建与启动方式（`builder = "nixpacks"`），不需要额外的 Dockerfile。

1. 在 Railway 新建项目，添加一个 Postgres 插件和一个从本仓库部署的服务
2. 在该服务的环境变量里填入 AGENTS.md §7 列出的变量（同 `.env.example`，尤其是 `DATABASE_URL`——用 Railway Postgres 插件提供的连接串、`AUTH_SECRET`、`NEXT_PUBLIC_SITE_URL`——填最终域名）
3. 推送到 `main`（或手动触发部署）。Railway 会：
   - 用 nixpacks 检测 Node 项目并 `npm install`，执行 `railway.toml` 里的 `buildCommand`（`npm run build`，产出含 standalone 输出的生产构建）
   - **构建阶段没有私有网络访问权限，连不到 `postgres.railway.internal`**，所以数据库迁移/种子不能放在 `buildCommand` 里（放进去会导致 `DATABASE_URL` 解析失败、构建报错）。它们放在 `preDeployCommand`（`npm run db:migrate && npm run db:seed`），这一步在部署阶段执行，和运行中的服务共享同一个私有网络，能正常连到 Railway Postgres
   - 用 `npm start` 启动，Railway 按 `healthcheckPath = "/api/health"` 探活，失败时按 `restartPolicyType = "ON_FAILURE"` 重启
4. 域名与 CDN：参考 AGENTS.md §7（建议 `.es`，DNS 托管 Cloudflare）
5. 图片上传：不要让 Railway 直接吐图片，走 Cloudflare R2（见 `.env.example` 里的 `R2_*`，功能尚未实现，见 AGENTS.md 当前进度）

**部署前必须避开的坑**（详见 AGENTS.md §7）：Railway 服务不会休眠、按时长计费；Railway Postgres 没有自动故障转移，需自行定期 `pg_dump` 备份；不要在 Hobby 套餐跑常驻后台 worker。

### 启用 Cloudflare Turnstile（可选）

不配置这两个变量时登录页会一直用内置的算术验证码，代码已经处理好这个降级（见 `lib/auth/turnstile.ts`），不会报错或白屏。要换成 Turnstile：

1. 打开 [Turnstile 控制台](https://dash.cloudflare.com/?to=/:account/turnstile)，新建一个 widget，Domain 填你的正式域名（如 `dianpin-production.up.railway.app` 或自定义域名）
2. 拿到 **Site Key** 和 **Secret Key**
3. 在 Railway 该服务的 Variables 里加：
   ```
   NEXT_PUBLIC_TURNSTILE_SITEKEY = <刚才的 Site Key>
   TURNSTILE_SECRET              = <刚才的 Secret Key>
   ```
4. 两个变量必须同时填——代码只有在都存在时才会切换到 Turnstile（`lib/auth/turnstile.ts` 的 `isTurnstileConfigured()`），只填一个等同于都没填
5. 保存后 Railway 会自动重新部署，之后 `/login` 页面会加载 Turnstile 组件（CSP 已经放行了 `challenges.cloudflare.com`，不需要再改 `next.config.ts`）

## CI

`.github/workflows/ci.yml` 在每个 PR 上跑 `npx tsc --noEmit` 和 `npm run build`，用占位 `DATABASE_URL`/`AUTH_SECRET`（构建期只做模块导入与路由收集，不会真的连接数据库或签发 token，见工作流文件内注释）。

## 目录速览

- `app/` — Next.js App Router 页面与 Server Actions
- `components/` — 自写轻组件（不引入 Ant Design / MUI 等重型库）
- `lib/` — 数据访问（`lib/db.ts`）、认证（`lib/auth/`）、i18n（`lib/i18n.ts`）、状态机（`lib/status-machine.ts`）
- `db/` — Drizzle schema、迁移生成配置、种子脚本
- `drizzle/` — 迁移 SQL 历史（增量保留，不要手改或squash）
- `index.html` — v1 交互原型，迁移到 Next.js 后作为行为对照蓝本保留
