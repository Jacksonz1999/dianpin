# AGENTS.md — 店聘（DianPin）

> 本文件是**唯一事实源**。Claude Code 与 WorkBuddy 都从这里读取上下文，任何与本项目相关的改动都必须先读本文件，改动后如发生事实变化请同步更新本文件。

## 1. 项目是什么

面向**西班牙华人**的门店招聘平台（对标 LinkedIn，但只做实体门店业态）。

- **求职者端**：华人员工，找百元店 / 酒吧 / 服装店 / 自助寿司 / 超市 / 中餐馆等服务类岗位
- **雇主端**：华人店主，发布岗位、筛选候选人
- **默认城市**：马德里、巴塞罗那（后续再扩瓦伦西亚等）
- **语言**：界面中文为主，岗位信息中西双语；界面可一键切 Español
- **产品名**：店聘（正式域名 `dianpin.eu`；`dianpin-jobs` 是早期规划域名，未实际购买，已废弃——不要在代码里再引用它）

**差异化（这是产品存在的理由，任何改动都不能削弱）**
1. 岗位信息**结构化**（工种/薪资/工时/包吃住/语言/居留都是字段，可筛选）— 对应竞品 `xbyhr.com`、`infohuaxin.com` 的纯文本帖子
2. **门店验证 + 评价 + 举报** — 对应微信群招工无验证的痛点
3. **投递状态清晰流转** — 已投递 → 已查看 → 已联系 → 已录用 / 未通过
4. **移动端优先、轻量、无沉重信息流** — 不要做成 LinkedIn 那种信息流

## 2. 技术栈（已决定）

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js（App Router）+ TypeScript** | SSR 弱网首屏快；岗位页可被收录、链接可在微信直接打开 |
| 样式 | **Tailwind CSS** | 移动优先；不引入 Ant Design / MUI 等重型组件库（这是"不像 LinkedIn"的技术前提） |
| 数据库 | **PostgreSQL**（Railway Postgres 或 Neon） | 见 §7 备份警告 |
| ORM | **Drizzle ORM + node-postgres**（drizzle-kit 做迁移） | 轻量、无查询引擎二进制，在 Railway 上比 Prisma 省资源；如坚持用 Prisma 请在此处改并说明理由 |
| 认证 | **见 §4 —— 西班牙 SMS 有新规，不要默认用短信验证码** | |
| 文件存储 | **Cloudflare R2 / S3**（不要用 Railway 存图片） | Railway 出网流量计费，图片走对象存储 |
| 部署 | **Railway** + 自有域名 | 见 §7 |
| 国际化 | 轻量双语字典（不引入重型 i18n 框架） | 只有 UI 文案 + 岗位 `_zh/_es` 双字段两种需求 |

## 3. 目录结构（目标形态）

```
dianpin/
├─ AGENTS.md            # 本文件，唯一事实源
├─ package.json
├─ next.config.ts
├─ app/
│  ├─ layout.tsx        # 移动端壳 + 底部导航
│  ├─ page.tsx          # 找工（首页岗位流 + 筛选）
│  ├─ job/[id]/page.tsx
│  ├─ store/[id]/page.tsx
│  ├─ me/page.tsx
│  ├─ me/applications/page.tsx
│  ├─ me/posts/page.tsx          # 第八轮新增：我发布的求职信息列表（管理/编辑/关闭）
│  ├─ me/posts/new/page.tsx      # 第八轮新增：发布求职信息表单
│  ├─ employer/page.tsx
│  ├─ employer/job/[id]/page.tsx
│  ├─ employer/seekers/page.tsx       # 第八轮新增：雇主浏览求职信息列表（城市/工种筛选）
│  ├─ employer/seekers/[id]/page.tsx  # 第八轮新增：求职信息详情（联系方式见 §6 展示规则）
│  ├─ role-mismatch/page.tsx     # 第十轮新增：账号角色不符的说明页，见 §6
│  ├─ admin/page.tsx             # 第十轮新增：重定向到 /admin/stores
│  ├─ admin/stores/page.tsx      # 第十轮新增：门店认证审批（唯一的管理员后台页面，见 §6）
│  └─ api/…
├─ components/          # 轻组件，禁止引入重型 UI 库
├─ lib/                 # db / auth / i18n / 状态机
└─ index.html           # 【保留】v1 本地演示版（单文件，localStorage），作为交互原型参照
```

## 4. 认证决策 ⚠️ 关键

**不要用「手机号短信验证码」作为默认方案。** 西班牙已实施新规：

- 自 **2026-09-15** 起，西班牙运营商**拦截**所有发往 `+34` 号码、使用**未注册字母 Sender ID** 的短信（SMS/MMS/RCS 全包括）。法规依据：Orden TDF/149/2025 + Circular 1/2026，由 CNMC Alias Registry 管理。
- **不受影响的例外：专用长号码（long code）和短号码（short code）不需要注册。**
- 品牌化 Sender ID 需要在 CNMC 门户注册，**门户只能用西班牙数字证书（FNMT）登录**，且法定代表人须在 10 个工作日内确认 —— 耗时且需要当地资质。
- CNMC 注册本身免费。

**推荐方案（按优先级）**
1. **WhatsApp OTP（首选）** — 西班牙 WhatsApp OTP 约 **$0.020/条**，对比短信 Twilio **$0.0875** / Bird $0.0846 / Plivo $0.0716（2026-07 基准价，不含运营商附加费）。**便宜约 4 倍**，且目标用户（西班牙华人）本来就用 WhatsApp 沟通。
2. **专用长号码发短信** — 走 §4 的例外，无需注册；但仍有运营商费用与 SMS pumping 风险。
3. **Twilio Verify 共用 Sender ID「TWVerify」** — Twilio 已代为注册；需有 **2026-11-15 前获批的 Primary Customer Profile**。
4. 邮箱魔法链接 — 成本最低，但华人用户习惯度弱。

**无论选哪种，必须做**：限流（每 IP / 每号码）、图形验证码或 hCaptcha、投递与注册频控 —— 防 **SMS pumping（AIT 套利欺诈）**，机器人可把你的账单刷爆。

**联系方式字段**：做成「电话 / 微信号」自由填写的字符串，不依赖任何 OAuth 授权。微信登录在欧盟有审核限制，v1 不做。

## 5. 数据模型（PostgreSQL，public schema）

| 表 | 关键字段 |
|---|---|
| `users` | id, role(seeker/employer), phone, wechat, name, locale, created_at |
| `seeker_profiles` | user_id, job_types[], experience_years, available_from, residence_status, expected_salary_min/max, preferred_cities[], live_in_ok, languages[], bio, avatar |
| `stores` | id, owner_user_id, name_zh/es, city, district, address, category, cover_image, photos[], verification_status, verified_at, rating_avg, rating_count, created_at（第十轮新增，管理员后台排序/展示用，之前这张表没有创建时间字段） |
| `jobs` | id, store_id, title_zh/es, job_type, city, district, salary_min/max, salary_period, headcount, schedule, live_in, meals_included, language_required, residence_required, description_zh/es, status, published_at, expires_at, views |
| `applications` | id, job_id, seeker_user_id, status, message, contact_revealed, created_at, updated_at — **UNIQUE(job_id, seeker_user_id)** |
| `reviews` | id, store_id, seeker_user_id, rating(1-5), comment, created_at |
| `reports` | id, target_type(job/store), target_id, reporter_user_id, reason, status |
| `cities` | id, name_zh, name_es, region |
| `job_types` | id, name_zh, name_es, icon |
| `job_alerts`（第七轮新增，见下方说明） | id, email, seeker_user_id(nullable), city(nullable), job_type(nullable), salary_min(nullable), meals_included, residence_ok, locale, confirm_token, confirmed_at, unsubscribe_token, created_at — **UNIQUE(email)** |
| `seeker_posts`（第八轮新增，见下方说明） | id, user_id(→users), title, job_type(→job_types), city(→cities), district, experience_years, available_from, residence_status, expected_salary_min/max, salary_period, languages[], live_in_ok, bio, contact_phone, contact_wechat, status(draft/active/closed), views, published_at, expires_at, is_seed, created_at, updated_at |

`seeker_posts`：第八轮新增的"反向发帖"——此前只有店主能发布岗位（`jobs`），求职者只能被动投递；这张表让求职者主动发一条结构化的"我要找 XX 工作"帖子，雇主可浏览并联系。字段刻意复用已有枚举（`residence_status` 用 §5 现有五值，`salary_period` 用 `jobs.salary_period` 的 hour/day/month），不新造枚举。`status` 状态机（draft/active/closed）定义在 `lib/status-machine.ts`，与 `jobs.status` 同构但不共用同一张表——求职帖和岗位帖是两种实体，不应该合并成一张多态表，否则筛选/索引都会变复杂。联系方式字段（`contact_phone`/`contact_wechat`）沿用 §4 的自由填写字符串约定，不依赖 OAuth。`is_seed` 对齐 `jobs`/`stores` 已有的演示数据标记约定，但本表**不预置任何种子数据**——真实求职者发的帖子如果和演示数据混在一起，雇主无法分辨哪些是真实可联系的人。展示规则见 §6。

`job_alerts`：真实岗位库存很小（个位数到十几条），"没有符合条件的岗位"不该是死路——求职者可以在筛选结果为空时，或在筛选栏下方常驻入口，免登录留下邮箱订阅"有新岗位通知我"，筛选条件（城市/工种/包吃住/可无居留/薪资下限）随订阅一起存下来。**双重确认（double opt-in）**：提交后发一封确认邮件，只有点击确认链接才会把 `confirmed_at` 置上，未确认的订阅不会收到任何通知邮件——这是 GDPR 合规要求，不是可选项。每封通知邮件都带一次性退订链接（`unsubscribe_token`）。`UNIQUE(email)` 意味着一个邮箱同一时间只有一份订阅条件，重复提交会更新已有条件而不是报错或建新行。触发时机：**仅在 `lib/db.ts` 的 `createJob` 内、且 `status=active` 时同步触发**（员工发布岗位的那次调用），不引入定时任务或常驻 worker（见 §7 的 Hobby 档常驻 worker 成本警告）。`db/import-csv.ts` 的批量导入直接写 `db.insert(jobs)`、不经过 `createJob`，因此批量导入不会触发通知——这是有意为之，避免一次性导入几十上百条历史数据时群发邮件轰炸订阅者。

**枚举值（不要自造）**
- `residence_status`: 有居留 / 办理中 / 学生居留 / 家庭居留 / 无居留
- `jobs.status`: draft / active / paused / filled / closed
- `applications.status`: submitted → viewed → contacted → hired / rejected / withdrawn
- `stores.verification_status`: unverified / pending / verified / rejected
- `jobs.residence_required`: none / prefer / required
- `jobs.salary_period`: hour / day / month
- `seeker_posts.status`: draft / active / closed

**索引**：`jobs(city, job_type, status)`、`jobs(store_id)`、`applications(job_id)`、`applications(seeker_user_id)`、`job_alerts(city, job_type)`、`seeker_posts(city, job_type, status)`、`seeker_posts(user_id)`。

**规则**：排序字段不要用中文枚举做 key；薪资筛选需把 hour/day 折算成月（hour×8×22、day×22）后再比较。

## 6. 路由与交互约定

- 移动端底部三 Tab：**求职者** = 找工 / 投递 / 我的；**雇主** = 工作台 / 发布 / 我的（移动端底部导航空间有限，`lib/nav-tabs.ts` 的 `getNavTabs()` 共享数组不新增第四个 Tab，因为它同时驱动 `BottomNav` 和桌面 `Header`，改数组会让手机也多出一个 Tab）。第八轮新增的"找人"入口（`/employer/seekers`）**只加在桌面 `Header` 的顶部导航**（与共享 tabs 数组并列渲染，不进数组本身），移动端改为在雇主工作台（`/employer`，本来就是三 Tab 之一）首屏放一张入口卡片——两端各自解决"进 Tab 的空间有限"这个问题，不是同一套实现
- **免登录可浏览**岗位列表与详情；只有投递、发布、查看联系方式时才要求登录（转化率优先）。第八轮新增的求职信息（`seeker_posts`）同样免登录可浏览列表与详情，仅联系方式字段登录门槛，见下一条
- 雇主**标记「已联系」后**才展示候选人完整联系方式 —— 防骚扰，不要提前暴露。`seeker_posts` 的联系方式门槛与此不同：求职帖没有"投递"动作可供状态流转，改为"以雇主身份登录后才在详情页展示联系方式"——列表页在任何登录状态下都**不渲染**手机号/微信号，这是底线，不能退让
- 岗位发布走模板化表单，禁止自由文本一大段；`seeker_posts` 发布表单同样模板化，标题/简介复用 `lib/validation.ts` 的 `assertNotPlaceholder()` 占位内容校验
- 排序默认按 `views` 或 `published_at` 倒序，v1 不做推荐算法（`seeker_posts` 列表同样不做推荐排序）
- 入口可见性（第八轮修复）：此前 `/employer` 虽然存在但没有任何面向求职者视角访客的入口——`lib/nav-tabs.ts` 的 `getNavTabs()` 只根据当前路径判断显示哪一侧导航，从未暴露跳转点。现在 `Header`（桌面）与 `/me`（移动端）各自提供一个"我是店主 · 招人"入口；对称地，雇主侧的 `Header`/`/employer/me` 也提供一个"浏览求职页面"的出口（**不是**身份切换——下一条）。首页顶部另有"我要找工作 / 我要招人"双入口（不阻挡岗位列表的轻量条）。未登录点击走各页自身的 `requireRole` 守卫，重定向到 `/login?role=...&next=...`，登录后回落到目标页，不单独维护一套跳转逻辑
- **账号角色一旦创建就固定，不支持切换**（第十轮重申并落地）：`app/auth/callback/route.ts` 里"已存在的 identifier 用它原本的角色登录，`intended_role` 只在创建新账号时生效"这条逻辑是唯一事实——没有、也不会有"同一账号在求职者/雇主间切换"的功能。由此推出的 UX 原则：**不要给用户看他用不了的入口**，与其把按钮置灰，不如不显示；与其假装能切换，不如说清楚边界。实现上：导航 Tab 集合（`BottomNav`/`Header` 消费 `getNavTabs()`）按账号的**实际角色**渲染，不是按当前 URL 路径——否则会出现"雇主账号停在 `/` 时看到求职者 Tab，点哪个都被 `requireRole` 弹回"的死循环（第十轮修复的那个 bug）。角色从 `app/layout.tsx`（server component）读一次 `getSession()`，经 `components/SessionProvider.tsx`（`useSessionRole()`）下发给 client 组件——会话 Cookie 是 `httpOnly`，client 侧没有别的办法拿到角色。`requireRole` 角色不符时跳转到 `/role-mismatch?needed=...&have=...`，明确告知"当前账号是什么身份、这个功能需要什么身份、无法切换、请用另一个邮箱单独注册"，不是含糊的首页 banner
- **管理员后台**（第十轮新增，`/admin/stores`）：唯一职责是门店认证审批（`pending` → `verified`/`rejected`），不做用户管理、不做仪表盘、不做审计日志。没有 `admin` 角色这个概念——访问控制是服务端比对当前登录用户的邮箱是否在 `ADMIN_EMAILS`（逗号分隔，见 §7）里，不在名单（含未配置该变量的情况）一律 `notFound()`，不是 403、不是重定向——不暴露这条路径的存在。所有写操作（通过/拒绝）走 Server Action 并在服务端重新校验管理员身份，不能只靠前端藏按钮。`app/robots.ts` 对 `/admin` 下 `Disallow`，且不进 `app/sitemap.ts`。

## 7. 部署（Railway）

**成本（2026-09 实测口径）**
- Hobby：**$5/月 底价**，含 $5 用量额度；超出后 RAM $10/GB-月、CPU $20/vCPU-月、Volume $0.15/GB-月、出网约 $0.05–0.10/GB
- **没有免费档**：Free 仅 $1/月额度（约 100MB RAM），等于试用
- Next.js + Postgres 实际约 **$6–22/月**，取决于数据库内存

**五个必须避开的坑**
1. **服务不会休眠** —— 24/7 计费，空闲也扣钱。不用时手动停掉非生产服务。
2. **Railway Postgres 没有 HA / 自动故障转移** —— 必须自己配定时备份 `pg_dump` 到对象存储，别把唯一副本放这儿。
3. **不要在 Railway 上直接吐图片** —— 出网按 GB 计费，门头照/头像一律走 R2 或 CDN。
4. **不要在 Hobby 上跑常驻后台 worker** —— 0.25 vCPU 常驻约 $30/月，比 Pro 底价还贵。定时任务走 Railway Cron 或外部调度。
5. **Hobby 档完全禁用出站 SMTP（25/465/587 全部端口）**——这是平台层面写死的限制，不是防火墙偶尔拦截，Railway 官方文档原话："SMTP is only available on the Pro plan and above. Free, Trial, and Hobby plans must use transactional email services with HTTPS APIs."（第七轮开发实测踩过这个坑：`SMTP_URL` 配置本身完全正确，连 Spaceship 官方文档给的主机/端口都对，照样 `Connection timeout`）。Hobby 档发邮件只能走 HTTPS API 的发信服务（本项目用的是 Resend，见 README「配置登录邮件」），不要再浪费时间排查 SMTP 凭据格式——除非已经升级到 Pro 档。

**环境变量**（Railway 里配置，不要进仓库）
```
DATABASE_URL=
NEXT_PUBLIC_SITE_URL=
AUTH_PROVIDER=            # whatsapp | sms | email
RESEND_API_KEY=           # 登录邮件 + 岗位订阅通知共用，见 README「配置登录邮件」——Hobby 档不能用裸 SMTP，见上面坑 5
EMAIL_FROM=               # info@dianpin.eu，域名须在 Resend 后台验证过
WHATSAPP_TOKEN= / TWILIO_ACCOUNT_SID= / TWILIO_AUTH_TOKEN=
R2_ACCOUNT_ID= / R2_ACCESS_KEY= / R2_SECRET_KEY= / R2_BUCKET=
ADMIN_EMAILS=             # 逗号分隔，不配则 /admin 对所有人 404，见 §6 管理员后台
```

**域名**：`.es` 对西班牙本地搜索与信任度最好，约 $15–22/年（续费约 $22/年）；你在西班牙有居留，注册无障碍。备选 `.eu`（需欧盟居留，你符合）或 `.com`。DNS 建议托管到 Cloudflare（免费 CDN + 免费 SSL + 缓存图片省出网流量）。

## 8. 编码约定

- TypeScript strict；组件默认服务端组件，只有需要交互的才 `'use client'`
- 所有用户可见文案走 `lib/i18n` 字典，**禁止硬编码中文字符串**
- 数据访问只在 `lib/db`，页面不直接写 SQL
- 状态机集中在 `lib/status-machine.ts`，UI 不自己判断状态合法性
- 移动端断点优先：先写 `sm` 以下，再增强；触控目标 ≥ 44px
- 提交前跑 `tsc --noEmit` + `next build`（本机 shell 可用时）

## 9. Claude Code ↔ WorkBuddy 分工

| 谁 | 负责 |
|---|---|
| **Claude Code** | 仓库内日常开发：Next.js 页面/组件/接口、数据库迁移、测试、commit、PR |
| **WorkBuddy** | 需求梳理与产品设计、市场调研、需求文档与报告产出、跨工具整合、文件与交付物生成、部署编排 |

**协作规则（避免互相踩脚）**
- **不要同时在同一个分支改同一批文件**；并行时按模块/分支切分
- 任何涉及产品定义、数据模型枚举、状态机的改动，**先改本文件再改代码**
- 提交信息用中文，前缀 `feat:` / `fix:` / `chore:` / `docs:`
- 决策若与本文档冲突，以本文档为准；要改决策先改本文件

## 10. 当前状态

- [x] 产品方案（含流程、数据模型、页面结构、选型理由）
- [x] **v1 交互原型**：`index.html` —— 单文件、localStorage、含双端完整流程与种子数据（14 岗位 / 6 门店 / 5 评价 / 5 演示投递）。**这是 Next.js 版的交互蓝本，不要丢弃**
- [ ] Next.js 工程初始化
- [ ] 数据库建表 + 种子数据迁移
- [ ] 认证（见 §4，优先 WhatsApp OTP）
- [ ] 图片上传
- [ ] Railway 部署 + 域名接入

**从原型迁移时必须保留的行为**（对照 `index.html` 逐项验证）
筛选四维（城市/工种/包吃住/可无居留/薪资）、投递状态时间轴、雇主端「已联系后才显示联系方式」、门店认证标识、评价与举报弹层、中/西切换。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
