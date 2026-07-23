import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";
import { getCurrentMembership, type AppRole } from "@/lib/auth/current-membership";

export const metadata: Metadata = { title: "论文档案" };

type ArchiveRow = {
  id: string;
  month: string;
  student: string;
  title: string;
  version: number;
  aiScore: number | null;
  teacherScore: number | null;
};

const demoRows: ArchiveRow[] = [
  { id: "chen-yuhang", month: "2026.07", student: "陈雨航", title: "面向轮腿机器人的接触状态估计方法探索", version: 2, aiScore: 8.2, teacherScore: 8.5 },
  { id: "chen-yuhang", month: "2026.06", student: "陈雨航", title: "接触检测基线与仿真环境搭建", version: 3, aiScore: 7.7, teacherScore: 8.0 },
];

export default async function ArchivePage() {
  const session = await getCurrentMembership();
  const preferredRole: AppRole = session.user?.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
  const role: AppRole = (session.membership?.role as AppRole | undefined) || preferredRole;
  let rows = session.configured ? [] : demoRows;

  if (session.configured && session.user && session.membership) {
    const { data: recordData } = await session.supabase
      .from("monthly_records")
      .select("student_id, research_month, official_version_id")
      .eq("group_id", session.membership.group_id)
      .not("official_version_id", "is", null)
      .order("research_month", { ascending: false });
    const records = recordData || [];
    const studentIds = Array.from(new Set(records.map((record) => record.student_id)));
    const versionIds = records.flatMap((record) => record.official_version_id ? [record.official_version_id] : []);
    const [{ data: profiles }, { data: versions }, { data: aiReviews }, { data: teacherReviews }] = await Promise.all([
      studentIds.length ? session.supabase.from("profiles").select("id, display_name").in("id", studentIds) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("submission_versions").select("id, title, version_number").in("id", versionIds) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("ai_reviews").select("submission_version_id, total_score, completed_at").in("submission_version_id", versionIds).eq("status", "completed").order("completed_at", { ascending: false }) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("teacher_reviews").select("submission_version_id, score").in("submission_version_id", versionIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
    const versionMap = new Map((versions || []).map((version) => [version.id, version]));
    const aiMap = new Map<string, number>();
    for (const review of aiReviews || []) if (review.total_score != null && !aiMap.has(review.submission_version_id)) aiMap.set(review.submission_version_id, Number(review.total_score));
    const teacherScores = new Map<string, number[]>();
    for (const review of teacherReviews || []) teacherScores.set(review.submission_version_id, [...(teacherScores.get(review.submission_version_id) || []), Number(review.score)]);

    rows = records.flatMap((record) => {
      if (!record.official_version_id) return [];
      const version = versionMap.get(record.official_version_id);
      if (!version) return [];
      const scores = teacherScores.get(record.official_version_id) || [];
      return [{
        id: record.official_version_id,
        month: String(record.research_month).slice(0, 7).replace("-", "."),
        student: profileMap.get(record.student_id) || "未命名学生",
        title: version.title,
        version: version.version_number,
        aiScore: aiMap.get(record.official_version_id) ?? null,
        teacherScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      }];
    });
  }

  const emptyText = session.configured && !session.membership ? "尚未加入课题组。" : "暂无论文。";

  return (
    <PlaceholderPage surface={role} eyebrow={`${role === "teacher" ? "导师端" : "学生端"} / 论文`} title={role === "teacher" ? "论文档案" : "组内论文"}>
      {rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>月份</th><th>学生</th><th>论文标题</th><th>版本</th><th>AI</th><th>导师</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={`${row.id}-${row.month}`}><td className="mono">{row.month}</td><td>{row.student}</td><td>{row.title}</td><td className="mono">v{row.version}</td><td className="score">{row.aiScore == null ? "—" : row.aiScore.toFixed(1)}</td><td className="score">{row.teacherScore == null ? "—" : row.teacherScore.toFixed(1)}</td><td className="action-cell"><Link className="text-link" href={`/papers/${row.id}`}>查看</Link></td></tr>)}</tbody></table></div> : <p className="empty-copy">{emptyText}</p>}
    </PlaceholderPage>
  );
}
