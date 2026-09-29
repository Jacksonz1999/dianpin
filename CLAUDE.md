# CLAUDE.md

@AGENTS.md

> 上面这行是 Claude Code 的文件引用语法，会自动把 `AGENTS.md` 全文载入上下文。
> `AGENTS.md` 是本项目的**唯一事实源**：产品定位、技术栈、数据模型、枚举值、状态机、编码约定都在里面。
> **每次开工前必须读完它再动手。**

## 构建与验证命令

```bash
npm install
npx tsc --noEmit     # 类型检查
npm run build        # Next.js 生产构建
npm run dev          # 本地开发，http://localhost:3000
```

**提交 PR 前，`tsc --noEmit` 和 `npm run build` 必须都通过。**

## 工作流规则（Claude Code Cloud 适用）

1. **永远在新分支上工作**，分支名 `claude/<wp编号>-<英文简述>`（如 `claude/wp0-scaffold`）。不要直接 push 到 `main`。
2. 完成后**开 PR 到 `main`**，PR 描述必须包含：改了哪些文件 / 怎么验证 / 是否需要新增环境变量 / 是否改动了数据模型。
3. 一个 PR 只做一件事。上一个 PR 合并后再开始下一个工作包。
4. **不要修改 `AGENTS.md` 里的技术栈、枚举值和状态机定义**——那是产品决策层。如果你认为必须改，在 PR 描述里说明理由，由人来定。
5. **禁止提交**：`.env`、密钥、真实手机号、任何 `NEXT_PUBLIC_` 以外的私密配置。
6. 移动端优先：先保证 **375px 宽度**可用，再考虑更宽。
7. 所有用户可见文案走 `lib/i18n` 字典，**禁止硬编码中文字符串**。
8. 不要引入重型 UI 组件库（Ant Design / MUI / Chakra）。只用 Tailwind + 自写轻组件。

## 数据模型的硬约束

- `residence_status` 只能是：有居留 / 办理中 / 学生居留 / 家庭居留 / 无居留
- `jobs.status`：draft / active / paused / filled / closed
- `applications.status`：submitted → viewed → contacted → hired / rejected / withdrawn
- `stores.verification_status`：unverified / pending / verified / rejected
- `applications` 表必须有 `UNIQUE(job_id, seeker_user_id)`
- 薪资筛选要先把 hour/day 折算成月（hour × 8 × 22、day × 22）再比较

## 当前进度

- [x] WP0 之前：产品方案 + `index.html` 交互原型（单文件、localStorage、含双端完整流程）
- [x] WP0 Next.js 工程骨架（不接数据库）
- [ ] WP1 数据库（Drizzle + Postgres + 迁移 + 种子）
- [ ] WP2 求职者端页面
- [ ] WP3 雇主端页面
- [ ] WP4 认证（WhatsApp OTP，非短信 —— 见 AGENTS.md §4）
- [ ] WP5 部署配置（Railway）+ CI + 图片上传

`index.html` 是交互蓝本，**不要删除**。迁移到 Next.js 后需逐项对照它验证行为是否一致。
