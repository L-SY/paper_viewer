import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="PaperView 首页">
          <span className="brand-mark">P</span>
          <span><strong>PaperView</strong><small>月度科研评阅</small></span>
        </Link>
        <SidebarNav />
        <div className="sidebar-guide">
          <span className="side-label">本月流程</span>
          <ol>
            <li className="done"><span>1</span><div>月初计划<small>已完成</small></div></li>
            <li className="current"><span>2</span><div>月末论文<small>提交中</small></div></li>
            <li><span>3</span><div>AI 评阅<small>未开始</small></div></li>
            <li><span>4</span><div>导师评语<small>未开始</small></div></li>
          </ol>
        </div>
        <div className="sidebar-footer">
          <div className="group-chip"><span>E3</span><div><strong>E3 Lab</strong><small>12 名学生 · 2 名导师</small></div></div>
          <div className="user-chip"><span className="avatar small">LS</span><div><strong>林老师</strong><small>导师</small></div><button type="button" aria-label="账户菜单">···</button></div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
