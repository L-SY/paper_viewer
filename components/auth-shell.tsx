import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-side">
          <Link className="brand auth-brand" href="/"><span className="brand-mark">P</span><span><strong>PaperView</strong><small>月度科研评阅</small></span></Link>
          <div className="auth-copy"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
        </div>
        <div className="auth-form-column"><div className="auth-box">{children}</div></div>
      </section>
    </main>
  );
}
