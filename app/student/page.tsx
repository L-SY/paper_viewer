import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { getMonthContext, shortTime } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "学生本月记录" };

export default async function StudentDashboardPage() {
  const session = await getCurrentMembership();
  let demo = true;
  let plan = ["完成接触状态估计流程的仿真基线。", "对比运动学残差、电机电流与融合方案。", "记录失败场景并分析误差来源。"];
  let versionNumber: number | null = 2;
  let versionMeta = "12页 · 3.8 MB";
  let versionId = "chen-yuhang";
  let aiScore: number | null = 8.2;
  let teacherScore: number | null = 8.5;
  let teacherComment = "先不要扩展网络结构，增加一个真实平台的小规模对照。";
  let month = getMonthContext();
  let planDeadline = "23:59";

  if (session.configured && session.user && session.membership?.role === "student") {
    demo = false;
    month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
    planDeadline = shortTime(session.group?.plan_deadline_time);
    const { data: record } = await session.supabase.from("monthly_records").select("id, plan_text, official_version_id").eq("group_id", session.membership.group_id).eq("student_id", session.user.id).eq("research_month", month.monthKey).maybeSingle();
    plan = record?.plan_text?.split(/\r?\n/).map((line: string) => line.replace(/^\s*\d+[.、]\s*/, "")).filter(Boolean) || [];
    versionId = record?.official_version_id || "";
    versionNumber = null;
    versionMeta = "尚未提交";
    aiScore = null;
    teacherScore = null;
    teacherComment = "导师尚未给出本月评语。";
    if (versionId) {
      const [{ data: version }, { data: ai }, { data: teacher }] = await Promise.all([
        session.supabase.from("submission_versions").select("version_number, page_count, size_bytes").eq("id", versionId).maybeSingle(),
        session.supabase.from("ai_reviews").select("total_score").eq("submission_version_id", versionId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        session.supabase.from("teacher_reviews").select("score, comment").eq("submission_version_id", versionId).limit(1).maybeSingle(),
      ]);
      versionNumber = version?.version_number || null;
      versionMeta = version ? `${version.page_count}页 · ${(version.size_bytes / 1024 / 1024).toFixed(1)} MB` : "已提交";
      aiScore = ai?.total_score == null ? null : Number(ai.total_score);
      teacherScore = teacher?.score == null ? null : Number(teacher.score);
      teacherComment = teacher?.comment || teacherComment;
    }
  }

  return (
    <AppShell surface="student">
      <header className="page-header"><div><div className="eyebrow">我的本月 {demo && <span className="demo-tag">演示</span>}</div><h1>{month.monthLabel}</h1></div></header>
      <section className="student-status-row"><div><span>月初计划</span><strong className={plan.length ? "check-text" : "muted-text"}>{plan.length ? "已填写" : "未填写"}</strong><small>{plan.length ? "已保存" : `${session.group?.plan_deadline_day || 5}日 ${planDeadline} 截止`}</small></div><div><span>论文提交</span><strong>{versionNumber ? `v${versionNumber}` : "未提交"}</strong><small>{versionMeta}</small></div><div><span>AI 评阅</span><strong className="score-large">{aiScore?.toFixed(1) || "—"}</strong><small>{aiScore == null ? "尚未完成" : "六维平均"}</small></div><div><span>导师评分</span><strong className="score-large">{teacherScore?.toFixed(1) || "—"}</strong><small>{teacherScore == null ? "尚未完成" : "已完成"}</small></div></section>
      <section className="content-section"><div className="section-heading"><h2>本月计划</h2></div><div className="plain-document">{plan.length ? <ol>{plan.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol> : <p className="empty-copy">暂无计划。</p>}</div></section>
      <section className="content-section"><div className="section-heading"><h2>最新反馈</h2></div><div className="feedback-strip"><div><span>AI 总分</span><p>{aiScore == null ? "尚未完成" : aiScore.toFixed(1)}</p></div><div><span>下一步重点</span><p>{aiScore == null ? "—" : "结合证据页码检查主要不足。"}</p></div><div><span>导师建议</span><p>{teacherComment}</p></div></div></section>
    </AppShell>
  );
}
