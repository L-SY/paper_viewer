import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { PaperListTable } from "@/components/paper-list-table";
import { getCurrentMembership, type AppRole } from "@/lib/auth/current-membership";
import { getMonthContext } from "@/lib/monthly-time";
import { loadPaperRows, type PaperListRow } from "@/lib/paper-list";

export const metadata: Metadata = { title: "历史记录" };

const demoRows: PaperListRow[] = [
  { id: "chen-yuhang", month: "2026-07", student: "陈雨航", title: "面向轮腿机器人的接触状态估计方法探索", summary: "融合两类信息构建轻量接触状态估计流程。", version: 2, aiScore: 8.2, aiReviewed: true, teacherScore: 8.5, status: "completed" },
  { id: "chen-yuhang", month: "2026-06", student: "陈雨航", title: "接触检测基线与仿真环境搭建", summary: "完成基线复现并记录仿真环境中的主要误差来源。", version: 3, aiScore: 7.7, aiReviewed: true, teacherScore: 8.0, status: "completed" },
];

function isMonth(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedMonth = Array.isArray(query.month) ? query.month[0] : query.month;
  const session = await getCurrentMembership();
  const preferredRole: AppRole = session.user?.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
  const role: AppRole = (session.membership?.role as AppRole | undefined) || preferredRole;
  const current = getMonthContext(session.group?.timezone || "Asia/Shanghai");
  let months = ["2026-07", "2026-06"];
  let selectedMonth = isMonth(requestedMonth) ? requestedMonth as string : months[0];
  let rows = demoRows.filter((row) => row.month === selectedMonth);

  if (session.configured && session.user && session.membership) {
    let monthQuery = session.supabase
      .from("monthly_records")
      .select("research_month")
      .eq("group_id", session.membership.group_id)
      .not("official_version_id", "is", null)
      .order("research_month", { ascending: false });
    if (role === "student") monthQuery = monthQuery.eq("student_id", session.user.id);
    const { data: monthRows } = await monthQuery;
    months = [...new Set((monthRows || []).map((row) => String(row.research_month).slice(0, 7)))];
    if (!months.length) months = [current.monthKey.slice(0, 7)];
    selectedMonth = isMonth(requestedMonth) && months.includes(requestedMonth as string)
      ? requestedMonth as string
      : months[0];
    rows = await loadPaperRows(session.supabase, {
      groupId: session.membership.group_id,
      month: `${selectedMonth}-01`,
      studentId: role === "student" ? session.user.id : undefined,
    });
  }

  return (
    <AppShell surface={role}>
      <header className="page-header">
        <div><div className="eyebrow">{role === "student" ? "我的记录" : "课题组记录"}</div><h1>历史</h1></div>
        <form className="month-picker" method="get">
          <label htmlFor="history-month">月份</label>
          <select id="history-month" className="text-input mono" name="month" defaultValue={selectedMonth}>
            {months.map((month) => <option value={month} key={month}>{month.replace("-", "年")}月</option>)}
          </select>
          <button className="button button-secondary" type="submit">查看</button>
        </form>
      </header>
      <section className="content-section">
        <PaperListTable rows={rows} showStudent={role === "teacher"} />
      </section>
    </AppShell>
  );
}
