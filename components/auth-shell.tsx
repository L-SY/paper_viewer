import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-side">
          <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span><strong>PaperView</strong><small>月度科研评阅</small></span></Link>
          <div className="auth-copy"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p><dl className="auth-role-summary"><div><dt>学生端</dt><dd>提交计划与论文，查看 AI 和导师反馈</dd></div><div><dt>导师端</dt><dd>跟踪全组进度，完成独立评分与归档</dd></div></dl></div>
          <footer className="auth-footer">PaperView · 面向课题组的月度科研记录</footer>
        </div>
        <div className="auth-form-column"><div className="auth-box">{children}</div></div>
      </section>
    </main>
  );
}
