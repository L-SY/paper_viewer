import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DeepSeekReviewError,
  DeepSeekReviewProvider,
  getDeepSeekRuntimeConfig,
} from "@/lib/ai/deepseek";
import { buildReviewPrompts, toStoredReviewFields } from "@/lib/ai/review-runtime";
import { extractPdfPages, PdfTextExtractionError } from "@/lib/pdf/extract-text";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  submissionVersionId: z.string().uuid(),
  language: z.enum(["zh", "en"]).default("zh"),
});

function errorResponse(error: unknown) {
  if (error instanceof DeepSeekReviewError) {
    return NextResponse.json(
      { error: error.message, code: error.code, retryable: error.retryable },
      { status: error.status },
    );
  }
  if (error instanceof PdfTextExtractionError) {
    return NextResponse.json(
      { error: error.message, code: error.code, retryable: false },
      { status: 422 },
    );
  }
  return NextResponse.json(
    { error: "AI 评阅执行失败。", code: "AI_REVIEW_FAILED", retryable: false },
    { status: 500 },
  );
}

export async function GET() {
  const config = getDeepSeekRuntimeConfig();
  return NextResponse.json({
    provider: "deepseek",
    configured: config.configured,
    model: config.model,
  });
}

export async function POST(request: Request) {
  const session = await getCurrentMembership();
  if (!session.configured || !session.user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  if (!session.membership) {
    return NextResponse.json({ error: "当前账号尚未加入课题组。" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "评阅请求格式不正确。" }, { status: 400 });
  }

  const config = getDeepSeekRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json(
      { error: "DeepSeek API 尚未配置。", code: "DEEPSEEK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "服务端数据库尚未配置。" }, { status: 503 });
  }

  const { data: version } = await session.supabase
    .from("submission_versions")
    .select("id, monthly_record_id, title, storage_path")
    .eq("id", parsed.data.submissionVersionId)
    .maybeSingle();
  if (!version) {
    return NextResponse.json({ error: "没有权限访问这个论文版本。" }, { status: 404 });
  }

  const { data: record } = await session.supabase
    .from("monthly_records")
    .select("id, group_id, student_id, research_month, plan_text")
    .eq("id", version.monthly_record_id)
    .maybeSingle();
  if (!record || record.group_id !== session.membership.group_id) {
    return NextResponse.json({ error: "没有权限评阅这篇论文。" }, { status: 403 });
  }
  if (session.membership.role === "student" && record.student_id !== session.user.id) {
    return NextResponse.json({ error: "学生只能发起自己论文的 AI 评阅。" }, { status: 403 });
  }

  const { data: versions } = await admin
    .from("submission_versions")
    .select("id")
    .eq("monthly_record_id", record.id);
  const versionIds = (versions || []).map((item) => item.id);
  const { data: existingRuns } = versionIds.length
    ? await admin
      .from("ai_reviews")
      .select("id, submission_version_id, attempt_number, status")
      .in("submission_version_id", versionIds)
    : { data: [] };
  const runs = existingRuns || [];
  const completedCount = runs.filter((run) => run.status === "completed").length;
  if (completedCount >= 3) {
    return NextResponse.json(
      { error: "本月已经完成三次 AI 评阅。", code: "AI_REVIEW_LIMIT_REACHED" },
      { status: 409 },
    );
  }
  if (runs.some((run) => run.status === "queued" || run.status === "running")) {
    return NextResponse.json(
      { error: "已有一项 AI 评阅正在进行，请稍后刷新。", code: "AI_REVIEW_IN_PROGRESS" },
      { status: 409 },
    );
  }

  const attemptNumber = completedCount + 1;
  const promptMetadata = buildReviewPrompts({
    title: version.title,
    researchMonth: record.research_month,
    extractedPages: [],
    monthlyPlan: record.plan_text,
  }, parsed.data.language);

  const queuedReview = {
    submission_version_id: version.id,
    attempt_number: attemptNumber,
    provider: "deepseek",
    model: config.model,
    prompt_version: promptMetadata.promptVersion,
    rubric_version: promptMetadata.rubricVersion,
    status: "queued",
    dimension_scores: null,
    total_score: null,
    strengths: null,
    weaknesses: null,
    suggestions: null,
    evidence: null,
    uncertainty_notes: null,
    raw_output: null,
    error_code: null,
    error_message: null,
    started_at: null,
    completed_at: null,
  };
  const reusableFailure = runs.find((run) => (
    run.submission_version_id === version.id
    && run.attempt_number === attemptNumber
    && run.status === "failed"
  ));
  const reviewRunResult = reusableFailure
    ? await admin
      .from("ai_reviews")
      .update(queuedReview)
      .eq("id", reusableFailure.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle()
    : await admin
      .from("ai_reviews")
      .insert(queuedReview)
      .select("id")
      .maybeSingle();
  const { data: reviewRun, error: createError } = reviewRunResult;
  if (createError || !reviewRun) {
    return NextResponse.json(
      {
        error: createError?.code === "23505"
          ? "已有一项 AI 评阅正在创建，请稍后刷新。"
          : createError?.message || "无法创建 AI 评阅记录。",
      },
      { status: createError?.code === "23505" ? 409 : 400 },
    );
  }

  await admin.from("ai_reviews").update({
    status: "running",
    started_at: new Date().toISOString(),
  }).eq("id", reviewRun.id);

  try {
    const { data: pdf, error: downloadError } = await admin.storage
      .from("monthly-papers")
      .download(version.storage_path);
    if (downloadError || !pdf) {
      throw new PdfTextExtractionError("PDF_DOWNLOAD_FAILED", "无法读取原始 PDF。");
    }
    const extracted = await extractPdfPages(await pdf.arrayBuffer());
    const prompts = buildReviewPrompts({
      title: version.title,
      researchMonth: record.research_month,
      extractedPages: extracted.pages,
      monthlyPlan: record.plan_text,
    }, parsed.data.language);
    const provider = new DeepSeekReviewProvider({
      userId: `paper_${version.id.replaceAll("-", "")}`,
    });
    const result = await provider.review({
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      schemaName: "paper_view_monthly_review",
    });
    const stored = toStoredReviewFields(result.review);

    const { error: saveError } = await admin.from("ai_reviews").update({
      ...stored,
      provider: result.provider,
      model: result.model,
      prompt_version: prompts.promptVersion,
      rubric_version: prompts.rubricVersion,
      status: "completed",
      raw_output: result.rawOutput,
      error_code: null,
      error_message: null,
      completed_at: new Date().toISOString(),
    }).eq("id", reviewRun.id);
    if (saveError) throw saveError;

    const { data: teacherReview } = await admin
      .from("teacher_reviews")
      .select("id")
      .eq("submission_version_id", version.id)
      .limit(1)
      .maybeSingle();
    await admin.from("monthly_records").update({
      status: teacherReview ? "completed" : "awaiting_teacher",
    }).eq("id", record.id);

    return NextResponse.json({
      ok: true,
      reviewId: reviewRun.id,
      attemptNumber,
      provider: result.provider,
      model: result.model,
      review: result.review,
    });
  } catch (error) {
    const code = error instanceof DeepSeekReviewError || error instanceof PdfTextExtractionError
      ? error.code
      : "AI_REVIEW_FAILED";
    const message = error instanceof Error ? error.message : "AI 评阅执行失败。";
    await admin.from("ai_reviews").update({
      status: "failed",
      error_code: code,
      error_message: message.slice(0, 2_000),
      completed_at: new Date().toISOString(),
    }).eq("id", reviewRun.id);
    return errorResponse(error);
  }
}
