import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { AccountFooter } from "./account-footer";
import { getCurrentMembership, type AppRole } from "@/lib/auth/current-membership";

export async function AppShell({ children, surface }: { children: ReactNode; surface?: AppRole }) {
  const session = await getCurrentMembership();
  let role: AppRole = surface || "teacher";
  let displayName = role === "teacher" ? "林老师" : "陈雨航";
  let email = "演示账号";

  if (session.configured) {
    if (!session.user) redirect("/login");
    const membershipRole = session.membership?.role as AppRole | undefined;
    if (membershipRole) role = membershipRole;
    else if (!surface) role = session.user.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
    if (surface && membershipRole && surface !== membershipRole) redirect(membershipRole === "teacher" ? "/teacher" : "/student");
    displayName = session.profile?.display_name || session.user.user_metadata.display_name || session.user.email?.split("@")[0] || "用户";
    email = session.user.email || "";
  }

  const roleLabel = role === "teacher" ? "导师" : "学生";
  const homeHref = role === "teacher" ? "/teacher" : "/student";
  const groupName = session.group?.name || "E3 Lab";
  const groupMark = groupName.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "组";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href={homeHref} aria-label={`PaperView ${roleLabel}首页`}>
          <span className="brand-mark">P</span>
          <span><strong>PaperView</strong><small>月度科研评阅</small></span>
        </Link>
        <SidebarNav role={role} />
        <div className="sidebar-footer">
          <div className="group-chip"><span>{groupMark}</span><div><strong>{groupName}</strong></div></div>
          <AccountFooter configured={session.configured} displayName={displayName} email={email} role={roleLabel} />
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
