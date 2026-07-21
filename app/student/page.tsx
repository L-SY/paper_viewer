import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { getMonthContext, shortTime } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "学生本月记录" };

export default async function StudentDashboardPage() {
  const session = await getCurrentMembership();
  let demo = true;
  let displayName = "陈雨航";
  let plan = ["完成接触状态估计流程的仿真基线。", "对比运动学残差、电机电流与融合方案。", "记录失败场景并分析误差来源。"];
  let versionNumber: number | null = 2;
  let versionMeta = "12页 · 3.8 MB";
  let versionId = "chen-yuhang";
  let aiScore: number | null = 8.2;
  let teacherScore: number | null = 8.5;
  let teacherComment = "先不要扩展网络结构，增加一个真实平台的小规模对照。";
  let month = getMonthContext();
  let planDeadline = "23:59";
  let paperDeadline = "23:59";

  if (session.configured && session.user && session.membership?.role === "student") {
    demo = false;
    displayName = session.profile?.display_name || session.user.email?.split("@")[0] || "学生";
    month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
    planDeadline = shortTime(session.group?.plan_deadline_time);
    paperDeadline = shortTime(session.group?.paper_deadline_time);
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
      <header className="page-header"><div><div className="eyebrow">学生端 / 我的本月 {demo && <span className="demo-tag">演示</span>}</div><h1>{month.monthLabel}</h1><p>{displayName} · 论文截止 {month.month}月{month.lastDay}日 {paperDeadline}</p></div><div className="header-actions"><Link className="button button-primary" href="/submit">编辑本月记录</Link></div></header>
      <section className="student-status-row"><div><span>月初计划</span><strong className={plan.length ? "check-text" : "muted-text"}>{plan.length ? "已填写" : "未填写"}</strong><small>{plan.length ? "已保存" : `${session.group?.plan_deadline_day || 5}日 ${planDeadline} 截止`}</small></div><div><span>论文提交</span><strong>{versionNumber ? `v${versionNumber}` : "未提交"}</strong><small>{versionMeta}</small></div><div><span>AI 评阅</span><strong className="score-large">{aiScore?.toFixed(1) || "—"}</strong><small>{aiScore == null ? "尚未完成" : "六维平均"}</small></div><div><span>导师评分</span><strong className="score-large">{teacherScore?.toFixed(1) || "—"}</strong><small>{teacherScore == null ? "尚未完成" : "已完成"}</small></div></section>
      <div className="student-dashboard-grid"><section className="content-section"><div className="section-heading"><div><h2>本月计划</h2><p>月初提交，后续修改会保留更新时间。</p></div><Link className="text-link" href="/submit">编辑</Link></div><div className="plain-document">{plan.length ? <ol>{plan.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol> : <p className="empty-copy">还没有填写本月计划。</p>}</div></section><aside className="content-section"><div className="section-heading"><div><h2>本月流程</h2></div></div><ol className="vertical-progress"><li className={plan.length ? "done" : ""}><strong>计划{plan.length ? "已提交" : "待提交"}</strong></li><li className={versionNumber ? "done" : ""}><strong>论文{versionNumber ? ` v${versionNumber} 已提交` : "待提交"}</strong></li><li className={aiScore != null ? "done" : ""}><strong>AI 评阅{aiScore != null ? "完成" : "未开始"}</strong></li><li className={teacherScore != null ? "done" : ""}><strong>导师评语{teacherScore != null ? "完成" : "未开始"}</strong></li></ol></aside></div>
      <section className="content-section"><div className="section-heading"><div><h2>最新反馈</h2><p>AI 与导师评价分别保存。</p></div>{versionId && <Link className="text-link" href={`/papers/${versionId}`}>查看完整评阅</Link>}</div><div className="feedback-strip"><div><span>AI 总分</span><p>{aiScore == null ? "AI 评阅尚未完成。" : `六个维度的算术平均为 ${aiScore.toFixed(1)}。`}</p></div><div><span>下一步重点</span><p>{aiScore == null ? "完成 PDF 提交后生成结构化建议。" : "结合证据页码检查主要不足，不必为了提高分数增加无关工作量。"}</p></div><div><span>导师建议</span><p>{teacherComment}</p></div></div></section>
    </AppShell>
  );
}
