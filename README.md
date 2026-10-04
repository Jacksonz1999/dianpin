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

不配置 `RESEND_API_KEY` 时，登录邮件的魔法链接会打印在服务端控制台（终端），不会真实发送，本地登录流程仍可完整走通。

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
2. 在该服务的环境变量里填入 AGENTS.md §7 列出的变量（同 `.env.example`，尤其是 `DATABASE_URL`——用 Railway Postgres 插件提供的连接串、`AUTH_SECRET`、`NEXT_PUBLIC_SITE_URL=https://dianpin.eu`——canonical/sitemap/robots/JSON-LD 全部读这一个变量，见 `lib/site-url.ts`，改域名只需要改这一处 Railway 变量，不需要改代码）
3. 推送到 `main`（或手动触发部署）。Railway 会：
   - 用 nixpacks 检测 Node 项目并 `npm install`，执行 `railway.toml` 里的 `buildCommand`（`npm run build`，产出含 standalone 输出的生产构建）
   - **构建阶段没有私有网络访问权限，连不到 `postgres.railway.internal`**，所以数据库迁移不能放在 `buildCommand` 里（放进去会导致 `DATABASE_URL` 解析失败、构建报错）。迁移放在 `preDeployCommand`（`npm run db:migrate`），这一步在部署阶段执行，和运行中的服务共享同一个私有网络，能正常连到 Railway Postgres。**`db:seed` 不在自动部署流程里**——见下面「演示数据 vs 真实数据」，需要种子数据时手动在 Railway 控制台的 Shell 里跑
   - 用 `npm start` 启动，Railway 按 `healthcheckPath = "/api/health"` 探活，失败时按 `restartPolicyType = "ON_FAILURE"` 重启
4. 域名与 CDN：参考 AGENTS.md §7（建议 `.es`，DNS 托管 Cloudflare）
5. 图片上传：不要让 Railway 直接吐图片，走 Cloudflare R2（见 `.env.example` 里的 `R2_*`，功能尚未实现，见 AGENTS.md 当前进度）

**部署前必须避开的坑**（详见 AGENTS.md §7）：Railway 服务不会休眠、按时长计费；Railway Postgres 没有自动故障转移，需自行定期 `pg_dump` 备份；不要在 Hobby 套餐跑常驻后台 worker。

### 启用 Cloudflare Turnstile（可选）

不配置这两个变量时登录页会一直用内置的算术验证码，代码已经处理好这个降级（见 `lib/auth/turnstile.ts`），不会报错或白屏。要换成 Turnstile：

1. 打开 [Turnstile 控制台](https://dash.cloudflare.com/?to=/:account/turnstile)，新建一个 widget，Domain 填正式域名 `dianpin.eu`
2. 拿到 **Site Key** 和 **Secret Key**
3. 在 Railway 该服务的 Variables 里加：
   ```
   NEXT_PUBLIC_TURNSTILE_SITEKEY = <刚才的 Site Key>
   TURNSTILE_SECRET              = <刚才的 Secret Key>
   ```
4. 两个变量必须同时填——代码只有在都存在时才会切换到 Turnstile（`lib/auth/turnstile.ts` 的 `isTurnstileConfigured()`），只填一个等同于都没填
5. 保存后 Railway 会自动重新部署，之后 `/login` 页面会加载 Turnstile 组件（CSP 已经放行了 `challenges.cloudflare.com`，不需要再改 `next.config.ts`）

### 配置登录邮件（必做——不配登录功能不可用）

**发信走 Resend（HTTPS API），不是 SMTP——这不是最初的设计，是被 Railway 的平台限制逼出来的决定，原因写清楚：**

最早的方案是通用 `nodemailer` + 真实邮箱（`info@dianpin.eu`，Spaceship/spacemail 提供）自己的 SMTP 凭据直接发信，特意不接 Resend/SendGrid 这类第三方服务。上线后实测登录邮件一直卡在 "Connection timeout"，排查到最后在 [Railway 官方文档](https://docs.railway.com/)里找到原因：

> SMTP is only available on the Pro plan and above. Free, Trial, and Hobby plans must use transactional email services with HTTPS APIs. SMTP is disabled on these plans to prevent spam and abuse.

也就是说：**Railway 的 Hobby 档完全禁用出站 SMTP（25/465/587 全部端口），不是防火墙偶尔拦截，是平台层面写死的限制**，不管 `SMTP_URL` 填得多对都连不上。本项目用的是 Hobby 档（见 AGENTS.md §7 的成本表），要么升级 Railway 到 Pro（更贵），要么换一个走 HTTPS（443 端口，没有平台会封）发信的服务——选了后者，也就是 Resend，这正是 Railway 自己文档里推荐的做法。

**现在的发信方式**：`lib/mail.ts` 统一用 `resend` 这个包的 HTTPS API 发信，登录魔法链接（`lib/auth/providers/email.ts`）和岗位订阅通知（`lib/job-alerts.ts`）共用同一个发信封装与同一套 `RESEND_API_KEY` 缺失/失败处理。

配置步骤：

1. 去 [resend.com](https://resend.com) 注册账号（有免费额度），在 [Domains](https://resend.com/domains) 里添加 `dianpin.eu`，按提示在 DNS 上加它要求的 SPF / DKIM 记录——**这一步跟 Spaceship 那边的 DNS 验证是两回事**：Spaceship 验证的是"这个域名的邮箱收发件服务"，Resend 验证的是"Resend 的服务器有没有权限代表 `dianpin.eu` 这个域名发信"，两边都要单独配置 DNS 记录，互不替代
2. 等 Resend 后台把 `dianpin.eu` 标记为已验证，去 [API Keys](https://resend.com/api-keys) 页面生成一个 API Key
3. 在 Railway 该服务的 Variables 里加：
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=info@dianpin.eu
   ```
   `EMAIL_FROM` 必须是**域名已经在 Resend 验证过**的地址（第 1 步做完这里才会生效），不需要是 Resend 账号本身注册时用的邮箱，也不需要这个邮箱真的有收件箱——Resend 只检查域名归属，不检查邮箱是否存在；**不要**把 `EMAIL_FROM` 改成 `noreply@dianpin.eu`——保持这个习惯是为了邮件看起来像真实发件地址而不是群发账号，即便 Resend 技术上并不要求邮箱真实存在
4. `RESEND_API_KEY`/`EMAIL_FROM` 都不带 `NEXT_PUBLIC_` 前缀，是运行时读取，不是构建时内联——和必须重新构建才生效的 `NEXT_PUBLIC_SITE_URL`（见上面部署步骤 2）不同，这两个变量改完**重启服务**（不需要重新构建）就会生效
5. 保存后用 `curl https://dianpin.eu/api/health` 确认返回里 `emailConfigured: true`，再实际跑一次登录流程确认真的收到邮件（检查垃圾箱）

**`info@dianpin.eu` 这个邮箱本身**（Spaceship 提供的收发件服务）跟上面的发信配置是两套独立的东西：Resend 只负责"代表这个域名寄出邮件"，不负责"这个邮箱能不能收信"——两者都要分别配置，谁先谁后不影响登录功能本身，只要 Resend 这边配好、`info@dianpin.eu` 的域名在 Resend 验证通过，登录邮件就能发出去。

**生产环境没配 `RESEND_API_KEY` 会怎样**：`lib/mail.ts`（登录邮件和岗位订阅通知共用）在 `NODE_ENV=production` 下会直接抛错而不是静默返回——登录请求会失败，`/login` 页面显示"发送失败，请稍后重试 / No se pudo enviar, inténtalo de nuevo"（`login.error.unknown`），而不是假装发送成功却永远收不到信。本地开发 / CI 不受影响，仍然是把魔法链接打印到服务端控制台。

### 配置管理员后台（可选——不配 `/admin` 对所有人都 404）

门店认证审批走 `/admin/stores`，没有专门的"管理员"账号角色，访问控制是服务端比对当前登录用户的邮箱是否在 `ADMIN_EMAILS` 这个环境变量里（见 `lib/admin.ts`）：

1. 在 Railway 该服务的 Variables 里加：
   ```
   ADMIN_EMAILS=你的邮箱@example.com
   ```
   多个管理员用英文逗号分隔，大小写不敏感。**不配这个变量时 `/admin` 对所有人都返回 404**——这是故意的默认行为（fail closed），不是待办事项
2. 这个变量不带 `NEXT_PUBLIC_` 前缀，运行时读取，**重启服务**（不需要重新构建）即可生效
3. 用配置过的邮箱登录后访问 `/admin`，会自动跳到 `/admin/stores`；用其他账号访问同一个地址会看到和路径不存在时一样的 404 页面——不会提示"无权限"，这是刻意的，避免暴露这条路径存在
4. 功能范围只有门店认证审批（待审批列表 + 通过/拒绝 + 按状态筛选查看全部门店），不做用户管理、不做仪表盘

## 演示数据 vs 真实数据

`stores`/`jobs` 表有一个 `is_seed` 字段，只有 `db/seed.ts` 插入的行会置为 `true`，通过网站正常发布的门店/岗位、CSV 导入的门店/岗位都是 `false`——这样才能把演示数据整体清空而不动真实数据。

```bash
npm run db:seed         # 灌演示数据（本地开发用）。生产环境（NODE_ENV=production）默认拒绝执行，
                         # 除非显式设置 ALLOW_SEED=true —— 演示数据不该悄悄出现在生产库里
npm run db:seed:clear   # 删掉所有 is_seed=true 的门店/岗位（及其投递/评价/举报），真实数据不受影响
```

演示门店一律是 `verification_status: "unverified"`（`db/seed.ts` 插入时强制覆盖，不管 `lib/seed.ts` 里写的是什么）——认证徽章是这个产品最核心的信任标志，演示数据不能冒充它。**这个强制覆盖只对新插入的行生效**：如果线上门店页面还能看到旧种子数据带着「认证中」之类的徽章，说明那是更早一次 `db:seed` 运行写入的行，从未被这次覆盖规则触碰过（`onConflictDoNothing` 不会更新已存在的行）。处理方法是在 Railway 该服务的控制台 **Shell** 标签页里手动跑一次：

```bash
npm run db:seed:clear   # 清掉所有旧种子门店/岗位（及其投递/评价/举报），真实数据不受影响
npm run db:seed         # 如果还想要演示数据，重新灌一次——这次插入的行会正确带 unverified
```

### 导入真实门店/岗位（CSV）

```bash
npm run db:import -- path/to/file.csv --dry-run   # 先看会写入/跳过哪些行，不实际写库
npm run db:import -- path/to/file.csv              # 真正导入
```

CSV 表头（中文，顺序见 `db/import-csv.ts` 顶部注释）：`门店名称 / 城市 / 区域 / 门店地址 / 门店类型 / 老板称呼 / 联系电话 / 认证状态 / 工种 / 薪资类型 / 薪资下限 / 薪资上限 / 货币 / 工作时间 / 招聘人数 / 包吃 / 包住 / 可住宿 / 语言要求 / 居留要求 / 岗位描述 / 发布日期`。

门店按「名称 + 城市」去重（已存在就复用，不会重复建店），门店主账号按手机号去重（同一个号码第二次出现会复用同一个账号）。城市、工种两列按当前数据库里 `cities`/`job_types` 表的中文名匹配，不认识的值会跳过该行并打印原因；下限/上限、货币（仅收 €/EUR）等字段也会做基本校验。已知的简化：`jobs` 表只有一个 `live_in` 布尔字段（AGENTS.md §5 就是这么定义的），CSV 里「包住」「可住宿」两列只要有一个填「是」就置 `live_in = true`——要把这两个概念拆成两个真字段是产品层面的决定，不是这个导入脚本能自己定的。

## CI

`.github/workflows/ci.yml` 在每个 PR 上跑 `npx tsc --noEmit` 和 `npm run build`，用占位 `DATABASE_URL`/`AUTH_SECRET`（构建期只做模块导入与路由收集，不会真的连接数据库或签发 token，见工作流文件内注释）。

## 目录速览

- `app/` — Next.js App Router 页面与 Server Actions
- `components/` — 自写轻组件（不引入 Ant Design / MUI 等重型库）
- `lib/` — 数据访问（`lib/db.ts`）、认证（`lib/auth/`）、i18n（`lib/i18n.ts`）、状态机（`lib/status-machine.ts`）
- `db/` — Drizzle schema、迁移生成配置、种子脚本
- `drizzle/` — 迁移 SQL 历史（增量保留，不要手改或squash）
- `index.html` — v1 交互原型，迁移到 Next.js 后作为行为对照蓝本保留
