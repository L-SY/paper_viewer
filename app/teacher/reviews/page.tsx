import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { getMonthContext } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "导师评阅队列" };

type QueueRow = { id: string; student: string; title: string; submittedAt: string; aiScore: number | null; aiReviewed: boolean; aiState: "idle" | "running" | "failed" | "completed" };

export default async function TeacherReviewsPage() {
  const session = await getCurrentMembership();
  let demo = true;
  let rows: QueueRow[] = [
    { id: "chen-yuhang", student: "周思琪", title: "多模态感知中的时序对齐实验", submittedAt: "07-20 20:41", aiScore: 7.6, aiReviewed: true, aiState: "completed" },
    { id: "chen-yuhang", student: "王泽宇", title: "灵巧手抓取失败案例分析", submittedAt: "07-19 23:08", aiScore: 8.7, aiReviewed: true, aiState: "completed" },
  ];

  if (session.configured && session.user && session.membership?.role === "teacher") {
    demo = false;
    const month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
    const { data: records } = await session.supabase.from("monthly_records").select("student_id, official_version_id, status").eq("group_id", session.membership.group_id).eq("research_month", month.monthKey).not("official_version_id", "is", null).neq("status", "completed");
    const versionIds = (records || []).flatMap((record) => record.official_version_id ? [record.official_version_id] : []);
    const studentIds = (records || []).map((record) => record.student_id);
    const [{ data: versions }, { data: profiles }, { data: aiReviews }] = await Promise.all([
      versionIds.length ? session.supabase.from("submission_versions").select("id, title, submitted_at").in("id", versionIds) : Promise.resolve({ data: [] }),
      studentIds.length ? session.supabase.from("profiles").select("id, display_name").in("id", studentIds) : Promise.resolve({ data: [] }),
      versionIds.length ? session.supabase.from("ai_reviews").select("submission_version_id, status, total_score, created_at").in("submission_version_id", versionIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);
    const versionMap = new Map((versions || []).map((version) => [version.id, version]));
    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
    const latestAi = new Map<string, string>();
    const completedAi = new Map<string, number | null>();
    for (const review of aiReviews || []) {
      if (!latestAi.has(review.submission_version_id)) latestAi.set(review.submission_version_id, review.status);
      if (review.status === "completed" && !completedAi.has(review.submission_version_id)) {
        completedAi.set(review.submission_version_id, review.total_score == null ? null : Number(review.total_score));
      }
    }
    const formatter = new Intl.DateTimeFormat("zh-CN", { timeZone: session.group?.timezone || "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    rows = (records || []).flatMap((record) => {
      const id = record.official_version_id;
      const version = id ? versionMap.get(id) : null;
      if (!id || !version) return [];
      const latestStatus = latestAi.get(id);
      const aiState = latestStatus === "queued" || latestStatus === "running"
        ? "running"
        : latestStatus === "failed"
          ? "failed"
          : completedAi.has(id)
            ? "completed"
            : "idle";
      return [{ id, student: profileMap.get(record.student_id) || "未命名学生", title: version.title, submittedAt: formatter.format(new Date(version.submitted_at)).replaceAll("/", "-"), aiScore: completedAi.get(id) ?? null, aiReviewed: completedAi.has(id), aiState }];
    });
  }

  return <AppShell surface="teacher"><header className="page-header"><div><div className="eyebrow">评阅 {demo && <span className="demo-tag">演示</span>}</div><h1>评阅队列</h1></div></header><section className="content-section">{rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>学生</th><th>论文</th><th>提交时间</th><th>AI 评阅</th><th>状态</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={`${row.id}-${row.student}`}><td>{row.student}</td><td>{row.title}</td><td className="mono">{row.submittedAt}</td><td>{row.aiScore == null ? row.aiReviewed ? <span className="check-text">已评阅</span> : <span className="muted-text">{row.aiState === "running" ? "评阅中" : row.aiState === "failed" ? "可重试" : "未开始"}</span> : <strong className="score">{row.aiScore.toFixed(1)}</strong>}</td><td><span className={`status-pill ${row.aiReviewed ? "awaiting" : "submitted"}`}>{row.aiReviewed ? "待评语" : row.aiState === "running" ? "AI评阅中" : "待AI评阅"}</span></td><td className="action-cell"><Link className="text-link" href={`/papers/${row.id}`}>{row.aiReviewed ? "查看评阅" : "打开论文"}</Link></td></tr>)}</tbody></table></div> : <p className="empty-copy">暂无待评阅论文。</p>}</section></AppShell>;
}
