import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { AccountFooter } from "./account-footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  let displayName = "林老师";
  let email = "演示账号";
  let role = "导师";

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: profile }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("group_members").select("role").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    ]);
    displayName = profile?.display_name || user.user_metadata.display_name || user.email?.split("@")[0] || "用户";
    email = user.email || "";
    role = membership?.role === "teacher" ? "导师" : membership?.role === "student" ? "学生" : "未加入组";
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="PaperView 首页">
          <span className="brand-mark">P</span>
          <span><strong>PaperView</strong><small>月度科研评阅</small></span>
        </Link>
        <SidebarNav />
        <div className="sidebar-footer">
          <div className="group-chip"><span>E3</span><div><strong>E3 Lab</strong><small>当前课题组</small></div></div>
          <AccountFooter configured={Boolean(supabase)} displayName={displayName} email={email} role={role} />
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
