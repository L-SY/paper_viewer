import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span><strong>PaperView</strong><small>月度科研评阅</small></span></Link>
        <div className="auth-box"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p>{children}</div>
        <footer className="auth-footer">PaperView · 面向课题组的月度科研记录</footer>
      </section>
    </main>
  );
}
