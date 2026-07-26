import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentStatus } from "@/lib/demo-data";

export type PaperListRow = {
  id: string;
  month: string;
  student: string;
  title: string;
  summary: string;
  version: number;
  aiScore: number | null;
  aiReviewed: boolean;
  teacherScore: number | null;
  status: StudentStatus;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function overviewFromRawOutput(value: unknown) {
  const raw = asRecord(value);
  const review = asRecord(raw?.review);
  const overview = asRecord(review?.paper_overview);
  return {
    title: typeof overview?.chinese_title === "string" ? overview.chinese_title : "",
    summary: typeof overview?.one_sentence_summary_zh === "string" ? overview.one_sentence_summary_zh : "",
  };
}

const statusMap: Record<string, StudentStatus> = {
  missing: "missing",
  submitted: "submitted",
  awaiting_teacher: "awaiting",
  completed: "completed",
};

export async function loadPaperRows(
  supabase: SupabaseClient,
  input: { groupId: string; month?: string; studentId?: string },
) {
  let recordQuery = supabase
    .from("monthly_records")
    .select("student_id, research_month, official_version_id, status")
    .eq("group_id", input.groupId)
    .not("official_version_id", "is", null)
    .order("research_month", { ascending: false });
  if (input.month) recordQuery = recordQuery.eq("research_month", input.month);
  if (input.studentId) recordQuery = recordQuery.eq("student_id", input.studentId);

  const { data: recordData } = await recordQuery;
  const records = recordData || [];
  const studentIds = [...new Set(records.map((record) => record.student_id))];
  const versionIds = records.flatMap((record) => record.official_version_id ? [record.official_version_id] : []);
  const [{ data: profiles }, { data: versions }, { data: aiReviews }, { data: teacherReviews }] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? supabase.from("submission_versions").select("id, title, version_number").in("id", versionIds)
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? supabase.from("ai_reviews").select("submission_version_id, total_score, raw_output, completed_at").in("submission_version_id", versionIds).eq("status", "completed").order("completed_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    versionIds.length
      ? supabase.from("teacher_reviews").select("submission_version_id, score").in("submission_version_id", versionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
  const versionMap = new Map((versions || []).map((version) => [version.id, version]));
  const aiMap = new Map<string, { score: number | null; title: string; summary: string }>();
  for (const review of aiReviews || []) {
    if (aiMap.has(review.submission_version_id)) continue;
    aiMap.set(review.submission_version_id, {
      score: review.total_score == null ? null : Number(review.total_score),
      ...overviewFromRawOutput(review.raw_output),
    });
  }
  const teacherMap = new Map((teacherReviews || []).map((review) => [
    review.submission_version_id,
    Number(review.score),
  ]));

  return records.flatMap((record): PaperListRow[] => {
    if (!record.official_version_id) return [];
    const version = versionMap.get(record.official_version_id);
    if (!version) return [];
    const ai = aiMap.get(record.official_version_id);
    return [{
      id: record.official_version_id,
      month: String(record.research_month).slice(0, 7),
      student: profileMap.get(record.student_id) || "未命名学生",
      title: ai?.title || version.title,
      summary: ai?.summary || "",
      version: version.version_number,
      aiScore: ai?.score ?? null,
      aiReviewed: Boolean(ai),
      teacherScore: teacherMap.get(record.official_version_id) ?? null,
      status: statusMap[record.status] || "submitted",
    }];
  });
}
