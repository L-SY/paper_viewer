# PaperView

面向研究课题组的月度计划、论文提交、AI 评阅与导师反馈系统。

## 当前状态

仓库已包含第一版可浏览产品骨架：

- 导师月度总览与四类状态统计
- 学生月初计划、PDF 多版本提交与往期引用界面
- 六维 AI 评分、页码证据和导师独立评分详情
- 论文档案、评分趋势和课题组管理入口
- Supabase 邮箱注册/登录适配器
- 邮箱验证、忘记密码、个人资料初始化和课题组邀请接受流程
- 独立的导师工作台与学生工作台，登录后按组内身份分流
- 学生计划与 PDF 版本写入、导师评语写入和课题组规则写入
- Resend 邀请邮件与月度计划/论文提醒接口
- PostgreSQL 数据模型、RLS 权限和私有 PDF bucket 策略

Supabase 尚未配置时，页面会明确显示“演示数据”，便于先完成界面与流程验证。

## 技术栈

- Next.js / TypeScript / React
- Supabase Auth、PostgreSQL、Storage 与 Row Level Security
- Tailwind CSS 4（基础）+ 项目级 CSS 设计系统
- Recharts（六维雷达图）
- Zod（AI 结构化输出校验）

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
copy .env.example .env.local
npm run dev
```

默认访问 <http://localhost:3000>。

## 接入 Supabase

1. 创建一个 Supabase 项目。
2. 在 SQL Editor 按文件名顺序执行 `supabase/migrations/` 中的迁移。
3. 从 `.env.example` 创建 `.env.local`，填写项目 URL 和 anon key。
4. 在 Supabase Auth 中启用 Email provider 和邮箱验证。
5. 在 Auth URL Configuration 中加入本地和正式域名的 `/auth/callback` 地址。
6. 保持 `monthly-papers` bucket 为 private；迁移会创建 bucket 与访问策略。

注册链路为：创建账号 → 验证邮箱 → 完善个人资料 → 接受课题组邀请。邀请码原文只在导师创建时返回一次，数据库只保存 SHA-256 哈希，并可选绑定受邀邮箱。

## 邮件发送

邮件分为两类：

- 注册验证和密码重置由 Supabase Auth 发送。正式使用前必须在 Supabase Authentication → SMTP Settings 配置自定义 SMTP；默认邮件服务只适合开发测试。`supabase/templates/` 中提供了确认邮箱和重置密码模板。
- 课题组邀请和月度提醒通过 Resend API 发送。设置 `RESEND_API_KEY`、`EMAIL_FROM` 和已验证的发件域名后，导师填写受邀邮箱即可自动发信。

`POST /api/reminders/monthly` 用于每日定时任务，请求必须带 `Authorization: Bearer <CRON_SECRET>`。接口只在截止日前两天为尚未提交的学生发送一次提醒，并用数据库幂等键避免重复发送。

要向 Gmail、Outlook 和 QQ 邮箱稳定投递，需要在邮件服务中验证自己的域名并配置 SPF、DKIM、DMARC。不要使用个人邮箱密码作为服务端密钥。

`SUPABASE_SERVICE_ROLE_KEY` 和所有 AI API key 只能放在服务端环境，绝不能使用 `NEXT_PUBLIC_` 前缀。

## 评阅数据约定

AI 对六个维度分别给出 1–10 分、理由和 PDF 页码证据：

1. 研究问题与目标
2. 逻辑与结构
3. 方法合理性
4. 证据与结论
5. 结果分析与研究反思
6. 表达与学术规范

后端对六维分数计算算术平均。每名学生每个研究月最多保留三次成功 AI 评阅；失败调用不计额度。导师评分与 AI 分数独立存储，不能覆盖 AI 原始结果。

## 验证

```bash
npm run typecheck
npm run build
npm run lint
```
