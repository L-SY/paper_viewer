"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "本月总览", mark: "月" },
  { href: "/submit", label: "我的提交", mark: "稿" },
  { href: "/archive", label: "论文档案", mark: "档" },
  { href: "/trends", label: "评分趋势", mark: "趋" },
  { href: "/group", label: "课题组", mark: "组" },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav" aria-label="主导航">
      <span className="side-label">工作台</span>
      {nav.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""}><span>{item.mark}</span>{item.label}</Link>;
      })}
    </nav>
  );
}
