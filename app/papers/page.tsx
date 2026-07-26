import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PaperListTable } from "@/components/paper-list-table";
import { getCurrentMembership, type AppRole } from "@/lib/auth/current-membership";
import { getMonthContext } from "@/lib/monthly-time";
import { loadPaperRows, type PaperListRow } from "@/lib/paper-list";

export const metadata: Metadata = { title: "组内论文" };

const demoRows: PaperListRow[] = [
  { id: "chen-yuhang", month: "2026-07", student: "陈雨航", title: "面向轮腿机器人的接触状态估计方法探索", summary: "融合运动学残差与电机电流信息完成接触状态估计的初步验证。", version: 2, aiScore: 8.2, aiReviewed: true, teacherScore: 8.5, status: "completed" },
  { id: "chen-yuhang", month: "2026-07", student: "周思琪", title: "多模态感知中的时序对齐实验", summary: "比较三种时序对齐方案在不同采样延迟下的表现。", version: 1, aiScore: 7.6, aiReviewed: true, teacherScore: null, status: "awaiting" },
];

export default async function GroupPapersPage() {
  const session = await getCurrentMembership();
  const preferredRole: AppRole = session.user?.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
  const role: AppRole = (session.membership?.role as AppRole | undefined) || preferredRole;
  const month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
  let rows = session.configured ? [] : demoRows;

  if (session.configured && session.membership) {
    rows = await loadPaperRows(session.supabase, {
      groupId: session.membership.group_id,
      month: month.monthKey,
    });
  }

  return (
    <AppShell surface={role}>
      <header className="page-header"><div><div className="eyebrow">课题组</div><h1>组内论文</h1><p>{month.monthLabel}</p></div></header>
      <section className="content-section"><PaperListTable rows={rows} /></section>
    </AppShell>
  );
}
