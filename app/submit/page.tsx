import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MonthlySubmissionForm } from "@/components/monthly-submission-form";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export const metadata: Metadata = { title: "提交论文" };

export default async function SubmitPage() {
  const session = await getCurrentMembership();
  let initialVersions = [{ id: "chen-yuhang", version_number: 2, original_filename: "monthly-paper-v2.pdf", size_bytes: 3984588, page_count: 12, submitted_at: "2026-07-20T22:14:00+08:00" }, { id: "chen-yuhang-v1", version_number: 1, original_filename: "monthly-paper-v1.pdf", size_bytes: 3565158, page_count: 11, submitted_at: "2026-07-18T19:42:00+08:00" }];
  if (session.configured && session.user && session.membership?.role === "student") {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { data: record } = await session.supabase.from("monthly_records").select("id, official_version_id").eq("group_id", session.membership.group_id).eq("student_id", session.user.id).eq("research_month", month).maybeSingle();
    initialVersions = [];
    if (record) {
      const { data: versions } = await session.supabase.from("submission_versions").select("id, version_number, original_filename, size_bytes, page_count, submitted_at").eq("monthly_record_id", record.id).order("version_number", { ascending: false });
      initialVersions = versions || [];
    }
  }
  return <AppShell surface="student"><header className="page-header"><div><div className="eyebrow">本月</div><h1>提交论文</h1></div></header><MonthlySubmissionForm initialVersions={initialVersions} demo={!session.configured} /></AppShell>;
}
