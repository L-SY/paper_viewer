import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMembership } from "@/lib/auth/current-membership";

const requestSchema = z.object({ submissionVersionId: z.string().uuid(), score: z.number().min(0).max(10), comment: z.string().trim().min(1).max(6000) });

export async function POST(request: Request) {
  const session = await getCurrentMembership();
  if (!session.configured || !session.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (session.membership?.role !== "teacher") return NextResponse.json({ error: "只有导师可以提交导师评语。" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "评分或评语格式不正确。" }, { status: 400 });

  const { data: version } = await session.supabase.from("submission_versions").select("id, monthly_record_id").eq("id", parsed.data.submissionVersionId).maybeSingle();
  if (!version) return NextResponse.json({ error: "没有权限访问这个论文版本。" }, { status: 404 });
  const { error } = await session.supabase.from("teacher_reviews").upsert({ submission_version_id: version.id, teacher_id: session.user.id, score: parsed.data.score, comment: parsed.data.comment }, { onConflict: "submission_version_id,teacher_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await session.supabase.from("monthly_records").update({ status: "completed" }).eq("id", version.monthly_record_id);
  return NextResponse.json({ ok: true });
}
