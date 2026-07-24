import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MonthlySubmissionForm } from "@/components/monthly-submission-form";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export const metadata: Metadata = { title: "计划与论文" };

export default async function SubmitPage() {
  const session = await getCurrentMembership();
  let initialPlan = "1. 完成接触状态估计流程的仿真基线；\n2. 对比运动学残差、电机电流与两者融合三种方案；\n3. 记录失败场景并分析误差来源。";
  let initialTitle = "面向轮腿机器人的接触状态估计方法探索";
  let initialVersions = [{ id: "chen-yuhang", version_number: 2, original_filename: "monthly-paper-v2.pdf", size_bytes: 3984588, page_count: 12, submitted_at: "2026-07-20T22:14:00+08:00" }, { id: "chen-yuhang-v1", version_number: 1, original_filename: "monthly-paper-v1.pdf", size_bytes: 3565158, page_count: 11, submitted_at: "2026-07-18T19:42:00+08:00" }];
  if (session.configured && session.user && session.membership?.role === "student") {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { data: record } = await session.supabase.from("monthly_records").select("id, plan_text, official_version_id").eq("group_id", session.membership.group_id).eq("student_id", session.user.id).eq("research_month", month).maybeSingle();
    initialPlan = record?.plan_text || "";
    initialTitle = "";
    initialVersions = [];
    if (record) {
      const { data: versions } = await session.supabase.from("submission_versions").select("id, version_number, original_filename, size_bytes, page_count, submitted_at, title").eq("monthly_record_id", record.id).order("version_number", { ascending: false });
      initialVersions = versions || [];
      initialTitle = versions?.[0]?.title || "";
    }
  }
  return <AppShell surface="student"><header className="page-header"><div><div className="eyebrow">本月</div><h1>计划与论文</h1></div></header><MonthlySubmissionForm initialPlan={initialPlan} initialTitle={initialTitle} initialVersions={initialVersions} demo={!session.configured} /></AppShell>;
}
