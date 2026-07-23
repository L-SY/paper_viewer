"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/auth/current-membership";

const teacherNav = [
  { href: "/teacher", label: "月度总览", mark: "月" },
  { href: "/teacher/reviews", label: "评阅队列", mark: "评" },
  { href: "/archive", label: "论文档案", mark: "档" },
  { href: "/trends", label: "学生趋势", mark: "趋" },
  { href: "/group", label: "课题组设置", mark: "组" },
];

const studentNav = [
  { href: "/student", label: "我的本月", mark: "月" },
  { href: "/submit", label: "计划与论文", mark: "稿" },
  { href: "/archive", label: "组内论文", mark: "档" },
  { href: "/trends", label: "我的趋势", mark: "趋" },
];

export function SidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const nav = role === "teacher" ? teacherNav : studentNav;
  return (
    <nav className="sidebar-nav" aria-label={`${role === "teacher" ? "导师" : "学生"}导航`}>
      {nav.map((item) => {
        const active = pathname === item.href || (item.href.startsWith(`/${role}`) && pathname.startsWith(`${item.href}/`));
        return <Link key={item.href} href={item.href} className={active ? "active" : ""}><span>{item.mark}</span>{item.label}</Link>;
      })}
    </nav>
  );
}
