import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "隐私与组内公开说明" };
export default function PrivacyPage() {
  return <main className="legal-page"><Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span><strong>PaperView</strong><small>月度科研评阅</small></span></Link><article><div className="eyebrow">PRIVACY</div><h1>隐私与组内公开说明</h1><p className="legal-lead">在注册和提交论文前，你需要清楚这些内容会被谁看到，以及 AI 评阅如何处理文件。</p><section><h2>组内公开</h2><p>加入课题组后，你提交的月度计划、原始 PDF、AI 评阅、导师评分与评语对本组在读成员和导师可见；组外账号不能访问。</p></section><section><h2>第三方 AI 处理</h2><p>发起 AI 评阅时，论文文本会发送给系统配置的 AI API。系统应记录服务商、模型和评阅时间，不允许服务端密钥出现在浏览器中。正式上线前，管理员还需确认服务商的数据保留政策。</p></section><section><h2>存储与版本</h2><p>PDF 使用私有对象存储，数据库只保存权限和版本信息。新版本不会覆盖旧版本；毕业后账号转为归档状态，历史记录继续由课题组保留。</p></section><section><h2>你可以做什么</h2><p>你可以下载自己的原始 PDF、查看所有评阅记录，并向导师申请更正个人资料或处理异常数据。AI 评分不能由导师直接修改，但导师始终拥有独立评分与评语。</p></section><Link className="button button-secondary legal-back" href="/login?mode=signup">返回注册</Link></article></main>;
}
