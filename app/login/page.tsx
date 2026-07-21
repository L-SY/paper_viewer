import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand" href="/"><span className="brand-mark">P</span><span><strong>PaperView</strong><small>月度科研评阅</small></span></Link>
        <div className="auth-box"><div className="eyebrow">WELCOME BACK</div><h1>登录你的课题组</h1><p>提交每月计划与论文，查看可追溯的 AI 评阅和导师反馈。</p><AuthForm /></div>
      </section>
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-demo"><div className="auth-demo-top"><strong>2026年7月 · 课题组总览</strong><span>12 位成员</span></div><div className="auth-demo-body"><div className="auth-demo-title" /><div className="auth-demo-line short" /><div className="auth-demo-metrics"><div>8</div><div>4</div><div>8.1</div></div>{[0, 1, 2, 3, 4].map((row) => <div className="auth-demo-row" key={row}><span /><span /><span /><span /><span /></div>)}</div></div>
      </section>
    </main>
  );
}
