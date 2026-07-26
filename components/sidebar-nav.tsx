"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/auth/current-membership";

const teacherNav = [
  { href: "/teacher", label: "本月", mark: "月" },
  { href: "/history", label: "历史", mark: "史" },
  { href: "/papers", label: "组内论文", mark: "文" },
  { href: "/group", label: "课题组设置", mark: "组" },
];

const studentNav = [
  { href: "/student", label: "本月", mark: "月" },
  { href: "/history", label: "历史", mark: "史" },
  { href: "/papers", label: "组内论文", mark: "文" },
];

export function SidebarNav({ role, activeHref }: { role: AppRole; activeHref?: string }) {
  const pathname = usePathname();
  const nav = role === "teacher" ? teacherNav : studentNav;
  return (
    <nav className="sidebar-nav" aria-label={`${role === "teacher" ? "导师" : "学生"}导航`}>
      {nav.map((item) => {
        const active = activeHref
          ? item.href === activeHref
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Link key={item.href} href={item.href} className={active ? "active" : ""}><span>{item.mark}</span>{item.label}</Link>;
      })}
    </nav>
  );
}
