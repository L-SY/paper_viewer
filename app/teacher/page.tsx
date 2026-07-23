import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { students, type DemoStudent, type StudentStatus } from "@/lib/demo-data";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { getMonthContext } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "导师月度总览" };

type DashboardRow = DemoStudent & { reviewId?: string };
type Member = { user_id: string };
type Profile = { id: string; display_name: string; discipline: string | null; research_stage: string };
type MonthlyRecord = { id: string; student_id: string; plan_text: string | null; official_version_id: string | null; status: string };
type Version = { id: string; version_number: number };
type AiScore = { submission_version_id: string; total_score: number | null };
type TeacherScore = { submission_version_id: string; score: number };

const stageLabel: Record<string, string> = { exploring: "探索阶段", proposal: "开题准备", research: "课题研究中", writing: "论文写作中" };
const statusMap: Record<string, StudentStatus> = { missing: "missing", submitted: "submitted", awaiting_teacher: "awaiting", completed: "completed" };

export default async function TeacherDashboardPage() {
  const session = await getCurrentMembership();
  let rows: DashboardRow[] = students;
  let demo = true;
  let groupName = "E3 LAB";
  let month = getMonthContext();

  if (session.configured && session.user && session.membership?.role === "teacher") {
    demo = false;
    groupName = session.group?.name || "课题组";
    month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
    const groupId = session.membership.group_id;
    const [{ data: memberData }, { data: recordData }] = await Promise.all([
      session.supabase.from("group_members").select("user_id").eq("group_id", groupId).eq("role", "student").eq("status", "active"),
      session.supabase.from("monthly_records").select("id, student_id, plan_text, official_version_id, status").eq("group_id", groupId).eq("research_month", month.monthKey),
    ]);
    const members = (memberData || []) as Member[];
    const records = (recordData || []) as MonthlyRecord[];
    const userIds = members.map((member) => member.user_id);
    const versionIds = records.flatMap((record) => record.official_version_id ? [record.official_version_id] : []);
    const [{ data: profileData }, { data: versionData }, { data: aiData }, { data: teacherData }] = await Promise.all([
      userIds.length ? session.supabase.from("profiles").select("id, display_name, discipline, research_stage").in("id", userIds) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("submission_versions").select("id, version_number").in("id", versionIds) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("ai_reviews").select("submission_version_id, total_score").in("submission_version_id", versionIds).eq("status", "completed").order("completed_at", { ascending: false }) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("teacher_reviews").select("submission_version_id, score").in("submission_version_id", versionIds) : Promise.resolve({ data: [] }),
    ]);
    const profiles = new Map(((profileData || []) as Profile[]).map((profile) => [profile.id, profile]));
    const recordByStudent = new Map(records.map((record) => [record.student_id, record]));
    const versions = new Map(((versionData || []) as Version[]).map((version) => [version.id, version.version_number]));
    const aiScores = new Map<string, number>();
    for (const review of (aiData || []) as AiScore[]) if (review.total_score != null && !aiScores.has(review.submission_version_id)) aiScores.set(review.submission_version_id, Number(review.total_score));
    const teacherScores = new Map(((teacherData || []) as TeacherScore[]).map((review) => [review.submission_version_id, Number(review.score)]));
    rows = members.map((member) => {
      const profile = profiles.get(member.user_id);
      const record = recordByStudent.get(member.user_id);
      const versionId = record?.official_version_id || undefined;
      return { id: member.user_id, name: profile?.display_name || "未命名成员", initials: (profile?.display_name || "成员").slice(0, 1), topic: `${profile?.discipline || "未填写方向"} · ${stageLabel[profile?.research_stage || "exploring"]}`, planDone: Boolean(record?.plan_text), version: versionId ? versions.get(versionId) || null : null, aiScore: versionId ? aiScores.get(versionId) ?? null : null, mentorScore: versionId ? teacherScores.get(versionId) ?? null : null, status: statusMap[record?.status || "missing"] || "missing", reviewId: versionId };
    });
  }

  const submitted = rows.filter((row) => row.version).length;
  const awaiting = rows.filter((row) => row.status === "awaiting").length;
  const missing = rows.filter((row) => row.status === "missing").length;
  const scored = rows.flatMap((row) => row.aiScore == null ? [] : [row.aiScore]);
  const average = scored.length ? (scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(1) : "—";

  return (
    <AppShell surface="teacher">
      <header className="page-header"><div><div className="eyebrow">{groupName.toUpperCase()} {demo && <span className="demo-tag">演示</span>}</div><h1>{month.monthLabel}</h1></div></header>
      <section className="month-bar" aria-label="本月流程与统计"><div className="month-stage"><span>当前阶段</span><strong>月末论文提交</strong></div><ol className="simple-flow"><li className="done">计划</li><li className="active">论文</li><li>AI评阅</li><li>导师评语</li></ol><dl className="inline-metrics"><div><dt>已提交</dt><dd>{submitted}</dd></div><div><dt>待评语</dt><dd>{awaiting}</dd></div><div><dt>未提交</dt><dd>{missing}</dd></div><div><dt>AI均分</dt><dd>{average}</dd></div></dl></section>
      <section className="content-section"><div className="section-heading"><h2>学生进度</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>学生</th><th>月初计划</th><th>论文版本</th><th>AI 评阅</th><th>导师评分</th><th>状态</th><th><span className="sr-only">操作</span></th></tr></thead><tbody>{rows.map((student) => <tr key={student.id}><td><div className="person-cell"><span className="avatar">{student.initials}</span><div><strong>{student.name}</strong><small>{student.topic}</small></div></div></td><td><span className={student.planDone ? "check-text" : "muted-text"}>{student.planDone ? "已填写" : "未填写"}</span></td><td className="mono">{student.version ? `v${student.version}` : "—"}</td><td>{student.aiScore ? <strong className="score">{student.aiScore.toFixed(1)}</strong> : <span className="muted-text">—</span>}</td><td>{student.mentorScore ? <strong className="score">{student.mentorScore.toFixed(1)}</strong> : <span className="muted-text">—</span>}</td><td><StatusPill status={student.status} /></td><td className="action-cell">{student.reviewId || student.id === "chen-yuhang" ? <Link className="text-link" href={`/papers/${student.reviewId || student.id}`}>查看评阅</Link> : <span className="muted-text">暂无论文</span>}</td></tr>)}</tbody></table></div></section>
    </AppShell>
  );
}
