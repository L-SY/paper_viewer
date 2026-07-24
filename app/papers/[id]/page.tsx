import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AiReviewAction } from "@/components/ai-review-action";
import { ReviewRadar } from "@/components/review-radar";
import { ReviewDimensionDetails, type ReviewConfidence, type ReviewDimensionDetail, type ReviewEvidence } from "@/components/review-dimension-details";
import { qualitativeReviewDimensions, reviewDimensions } from "@/lib/review-dimensions";
import { TeacherReviewForm } from "@/components/teacher-review-form";
import { PdfReader } from "@/components/pdf-reader";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export const metadata: Metadata = { title: "论文评阅" };
type ReviewDimension = ReviewDimensionDetail & { resultKey: string };
type ReviewRunStatus = "queued" | "running" | "completed" | "failed";

const qualitativeLevelLabels: Record<string, string> = {
  needs_clarification: "需要补充",
  basically_clear: "基本清楚",
  clear_and_sufficient: "清楚充分",
  deep_and_complete: "深入完整",
  not_assessable: "无法评价",
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asTextList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const candidate = item as Record<string, unknown>;
      const text = candidate.text ?? candidate.comment ?? candidate.description ?? candidate.suggestion;
      if (typeof text === "string") return [text];
    }
    return [];
  });
}

function asEvidenceList(value: unknown): ReviewEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const page = Number(candidate.page);
    const observation = typeof candidate.observation === "string" ? candidate.observation : "";
    const quote = typeof candidate.quote === "string" ? candidate.quote : undefined;
    const kind = candidate.kind === "inference" ? "inference" : candidate.kind === "fact" ? "fact" : null;
    return Number.isInteger(page) && page > 0 && observation && kind ? [{ page, quote, observation, kind }] : [];
  });
}

function asConfidence(value: unknown): ReviewConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

const demoDimensionDetails: Record<string, Omit<ReviewDimensionDetail, "key" | "short" | "name" | "score" | "scale" | "maxScore" | "levelLabel">> = {
  goal: {
    explanation: "研究问题收敛到组合运动残差和电机电流能否降低误检率，并说明本月只验证这一较小问题，符合 8–10 分锚点。",
    strengths: ["本月目标与长期算法研究进行了区分。"],
    gaps: ["软地面场景的成功判断条件还可以进一步量化。"],
    evidence: [{ page: 1, observation: "引言明确提出组合两类信息能否降低单一阈值误检率的问题。", kind: "fact" }],
    nextAction: "为软地面场景补充可操作的改善阈值或判定标准。",
    confidence: "high",
  },
  logic: {
    explanation: "目标、融合流程、初步结果和限制能够对应，主要推理链清楚；软地面结果到摩擦模型解释之间仍有轻微跳跃。",
    strengths: ["正文按照问题、方法和结果推进。"],
    gaps: ["摩擦模型影响目前是解释性推断，尚未在结构上与备选原因并列比较。"],
    evidence: [{ page: 1, observation: "引言、方法和初步结果围绕同一误检问题展开。", kind: "inference" }],
    nextAction: "把软地面失败的候选原因整理为并列假设，并说明各自的验证方式。",
    confidence: "high",
  },
  method: {
    explanation: "融合运动学残差和电流信息与接触状态估计问题匹配，也给出了主要处理步骤；部分场景参数和对照条件仍不充分。",
    strengths: ["方法包含时间对齐、归一化、窗口检测和置信度融合。"],
    gaps: ["软地面摩擦参数和各场景一致的评价条件没有完整说明。"],
    evidence: [{ page: 1, observation: "方法部分列出了四个主要处理步骤。", kind: "fact" }],
    nextAction: "固定并报告各场景的摩擦参数、阈值和对照设置。",
    confidence: "medium",
  },
  evidence: {
    explanation: "论文报告了高速步态改善和软地面未稳定改善，但展示内容不足以核查场景间差异，因此达到合格基准但存在重要证据缺口。",
    strengths: ["保留了没有改善的阴性结果，没有只呈现有利场景。"],
    gaps: ["缺少逐场景样本量、波动范围和完整对比数据。"],
    evidence: [{ page: 1, observation: "初步结果同时陈述高速步态改善和慢速软地面未稳定改善。", kind: "fact" }],
    nextAction: "补齐逐场景统计、样本量和波动范围，并使主要结论逐项回指数据。",
    confidence: "medium",
  },
  reflection: {
    explanation: "能够如实讨论失败场景并提出摩擦模型这一待验证原因，体现了有效反思；候选原因的优先级仍可加强。",
    strengths: ["失败结果被转化为下一步排查方向。"],
    gaps: ["尚未说明为什么摩擦模型比传感噪声或时间对齐更值得优先验证。"],
    evidence: [{ page: 1, observation: "结果部分指出慢速软地面没有稳定改善。", kind: "fact" }],
    nextAction: "为三个最可能误差来源设计成本最低的排除实验并排序。",
    confidence: "medium",
  },
  writing: {
    explanation: "标题、目标、方法和初步结果表达简洁，组内读者可以快速理解；正式图表和参数定义仍需在完整版本中检查。",
    strengths: ["关键研究问题用一句话明确表达。"],
    gaps: ["当前预览没有展示足够的图注、单位和符号定义。"],
    evidence: [{ page: 1, observation: "摘要和引言对研究范围作了直接说明。", kind: "fact" }],
    nextAction: "检查所有图表是否包含可独立理解的图注、单位、条件和缩写定义。",
    confidence: "low",
  },
};

export default async function PaperReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentMembership();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isDemo = !session.configured;
  const isTeacher = isDemo || session.membership?.role === "teacher";
  let submissionVersionId: string | null = null;
  let studentName = "陈雨航";
  let monthLabel = "2026年7月";
  let compactMonth = "2026.07";
  let versionNumber = 2;
  let paperTitle = "面向轮腿机器人的接触状态估计方法探索";
  let filename = "monthly-paper-v2.pdf";
  let pageCount = 12;
  let sizeMb = "3.8";
  let submittedLabel = "7月20日 22:14";
  let pdfUrl: string | null = null;
  let aiTotal: number | null = 8;
  let provider = "OpenAI";
  let model = "GPT-5.2";
  let promptVersion = "v0.2.0";
  let rubricVersion = "v1.1.0";
  let attempt = 2;
  let completedCount = 2;
  let activeStatus: ReviewRunStatus | null = null;
  let lastError: string | null = null;
  let reviewMode: "numeric" | "qualitative" = "numeric";
  let dimensions: ReviewDimension[] = reviewDimensions.map((dimension) => ({
    ...dimension,
    ...demoDimensionDetails[dimension.key],
    scale: "numeric",
    maxScore: 10,
  }));
  let strengths = [
    "研究问题收敛到可在一个月内验证的小问题，目标、基线和判断标准基本对应。",
    "如实报告软地面场景未获得稳定改善，并提出可能的摩擦模型影响，没有把局部结果过度包装成成功。",
  ];
  let improvements = ["目前只报告汇总误检率，缺少每个场景的样本量、方差或置信区间。建议下月优先补齐逐场景统计，并明确软地面实验中摩擦参数的设置范围。"];
  let uncertaintyNotes = ["当前演示只展示论文节选，因此表达与学术规范维度的信息充分程度较低。"];
  let reviewSummary = "";
  let progressSummary: {
    documentedWork: string[];
    completedOrAdvanced: string[];
    blockedChangedOrInconclusive: string[];
    planAlignment: string;
  } | null = null;
  let workBlocks: Array<{ title: string; summary: string; outcome: string }> = [];
  let rawReview: Record<string, unknown> | null = null;
  let mentorScore: number | null = 8.5;
  let mentorComment = "这个月的问题拆得比较合适，也敢于保留没有改善的结果。下个月先不要急着扩展网络结构，把软地面下的误差来源拆清楚；建议补一个真实平台上的小规模对照。";

  if (session.configured) {
    if (!session.user || !uuidPattern.test(id)) notFound();
    submissionVersionId = id;
    const { data: version } = await session.supabase.from("submission_versions").select("id, monthly_record_id, version_number, title, storage_path, original_filename, size_bytes, page_count, submitted_at").eq("id", id).maybeSingle();
    if (!version) notFound();
    const { data: record } = await session.supabase.from("monthly_records").select("student_id, research_month").eq("id", version.monthly_record_id).maybeSingle();
    if (!record) notFound();
    const { data: monthlyVersions } = await session.supabase
      .from("submission_versions")
      .select("id")
      .eq("monthly_record_id", version.monthly_record_id);
    const monthlyVersionIds = (monthlyVersions || []).map((item) => item.id);
    const [{ data: profile }, { data: ai }, { data: teacher }, signed, { data: runs }] = await Promise.all([
      session.supabase.from("profiles").select("display_name").eq("id", record.student_id).maybeSingle(),
      session.supabase.from("ai_reviews").select("attempt_number, provider, model, prompt_version, rubric_version, dimension_scores, total_score, strengths, weaknesses, suggestions, evidence, uncertainty_notes, raw_output").eq("submission_version_id", id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      session.supabase.from("teacher_reviews").select("score, comment").eq("submission_version_id", id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      session.supabase.storage.from("monthly-papers").createSignedUrl(version.storage_path, 3600),
      monthlyVersionIds.length
        ? session.supabase.from("ai_reviews").select("status, error_message, created_at").in("submission_version_id", monthlyVersionIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    const researchDate = new Date(`${record.research_month}T00:00:00Z`);
    const year = researchDate.getUTCFullYear();
    const month = researchDate.getUTCMonth() + 1;
    studentName = profile?.display_name || "未命名学生";
    monthLabel = `${year}年${month}月`;
    compactMonth = `${year}.${String(month).padStart(2, "0")}`;
    versionNumber = version.version_number;
    paperTitle = version.title;
    filename = version.original_filename;
    pageCount = version.page_count;
    sizeMb = (Number(version.size_bytes) / 1024 / 1024).toFixed(1);
    submittedLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: session.group?.timezone || "Asia/Shanghai", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(version.submitted_at));
    pdfUrl = signed.data?.signedUrl || null;
    aiTotal = ai?.total_score == null ? null : Number(ai.total_score);
    provider = ai?.provider || "—";
    model = ai?.model || "尚未生成";
    promptVersion = ai?.prompt_version || "—";
    rubricVersion = ai?.rubric_version || "—";
    attempt = ai?.attempt_number || 0;
    const runRows = (runs || []) as Array<{ status: ReviewRunStatus; error_message: string | null }>;
    completedCount = runRows.filter((run) => run.status === "completed").length;
    activeStatus = runRows.find((run) => run.status === "queued" || run.status === "running")?.status || null;
    lastError = runRows.find((run) => run.status === "failed")?.error_message || null;
    const dimensionSource = ai?.dimension_scores && typeof ai.dimension_scores === "object" ? ai.dimension_scores as Record<string, unknown> : {};
    reviewMode = asRecord(dimensionSource.problem_goal)?.display_level ? "qualitative" : "numeric";
    dimensions = reviewMode === "qualitative"
      ? qualitativeReviewDimensions.map((dimension) => {
        const detail = asRecord(dimensionSource[dimension.resultKey]);
        const value = Number(detail?.level_code);
        const displayLevel = typeof detail?.display_level === "string" ? detail.display_level : "not_assessable";
        return {
          ...dimension,
          score: Number.isFinite(value) ? value : 0,
          scale: "qualitative" as const,
          maxScore: 4,
          levelLabel: qualitativeLevelLabels[displayLevel] || "无法评价",
          explanation: typeof detail?.dimension_summary === "string" ? detail.dimension_summary : "",
          strengths: asTextList(detail?.what_is_clear).slice(0, 2),
          gaps: asTextList(detail?.what_needs_clarification).slice(0, 2),
          evidence: asEvidenceList(detail?.evidence).slice(0, 4),
          nextAction: typeof detail?.actionable_suggestion === "string" ? detail.actionable_suggestion : "",
          confidence: asConfidence(detail?.confidence),
        };
      })
      : reviewDimensions.map((dimension) => {
        const raw = dimensionSource[dimension.resultKey] ?? dimensionSource[dimension.key];
        const detail = asRecord(raw);
        const value = typeof raw === "number" ? raw : Number(detail?.score);
        return {
          ...dimension,
          score: Number.isFinite(value) ? value : 0,
          scale: "numeric" as const,
          maxScore: 10,
          explanation: typeof detail?.explanation === "string" ? detail.explanation : "",
          strengths: asTextList(detail?.strengths).slice(0, 2),
          gaps: asTextList(detail?.gaps).slice(0, 2),
          evidence: asEvidenceList(detail?.evidence).slice(0, 4),
          nextAction: typeof detail?.next_action === "string" ? detail.next_action : "",
          confidence: asConfidence(detail?.confidence),
        };
      });
    strengths = asTextList(ai?.strengths);
    improvements = [...asTextList(ai?.weaknesses), ...asTextList(ai?.suggestions)];
    uncertaintyNotes = asTextList(ai?.uncertainty_notes);
    const rawOutput = asRecord(ai?.raw_output);
    rawReview = asRecord(rawOutput?.review);
    const overallFeedback = asRecord(rawReview?.overall_feedback);
    reviewSummary = typeof overallFeedback?.summary === "string" ? overallFeedback.summary : "";
    const progress = asRecord(rawReview?.progress_summary);
    if (progress) {
      progressSummary = {
        documentedWork: asTextList(progress.documented_work),
        completedOrAdvanced: asTextList(progress.completed_or_advanced),
        blockedChangedOrInconclusive: asTextList(progress.blocked_changed_or_inconclusive),
        planAlignment: typeof progress.plan_alignment_summary === "string" ? progress.plan_alignment_summary : "",
      };
    }
    workBlocks = Array.isArray(rawReview?.work_blocks)
      ? rawReview.work_blocks.flatMap((item) => {
        const block = asRecord(item);
        if (!block) return [];
        return [{
          title: typeof block.title === "string" ? block.title : "未命名工作",
          summary: typeof block.summary === "string" ? block.summary : "",
          outcome: typeof block.outcome_state === "string" ? block.outcome_state : "unclear",
        }];
      })
      : [];
    mentorScore = teacher?.score == null ? null : Number(teacher.score);
    mentorComment = teacher?.comment || "导师尚未给出本月评语。";
  }

  return (
    <AppShell>
      <header className="page-header"><div><div className="eyebrow">{compactMonth} / VERSION {versionNumber}</div><h1>{paperTitle}</h1><p>{studentName} · {monthLabel}月度论文 · {submittedLabel} 提交</p></div><div className="header-actions">{pdfUrl ? <a className="button button-secondary" href={pdfUrl} download={filename}>下载原始 PDF</a> : <button className="button button-secondary" type="button" disabled>下载原始 PDF</button>}</div></header>

      <div className="paper-layout">
        <section className="paper-panel" aria-label="PDF 在线预览">{pdfUrl ? <PdfReader url={pdfUrl} filename={filename} pageCount={pageCount} sizeLabel={`${sizeMb} MB`} /> : <><div className="panel-toolbar"><div><strong>{filename}</strong><span>{pageCount} 页 · {sizeMb} MB</span></div></div><div className="pdf-stage"><article className="pdf-page"><h2>{paperTitle}</h2><div className="authors">Yuhang Chen · E3 Laboratory</div><h3>Abstract</h3><p>针对轮腿机器人在非结构化地形中接触状态难以稳定估计的问题，本月工作构建了一套基于足端运动残差与电机电流信息的轻量估计流程，并在仿真环境中完成初步消融验证。</p><h3>I. Introduction</h3><p>本月研究的目标不是提出完整的新算法，而是回答一个更小的问题：组合运动学残差和电机电流能否降低单一阈值的误检率？</p><div className="figure-placeholder">Fig. 1. Contact estimation pipeline and experimental setup</div><h3>II. Method</h3><p>方法包含时间对齐、特征归一化、候选接触窗口检测与置信度融合四个步骤。</p><h3>III. Preliminary Results</h3><p>融合方法降低了高速步态下的误检，但慢速软地面场景没有稳定改善。</p></article></div></>}</section>

        <section className="review-panel" aria-label="评阅详情">
          <div className="review-header">
            <div className="review-header-top">
              <div>
                <h2>AI 六维评阅</h2>
                <p>{reviewMode === "qualitative" ? "六个维度独立形成研究思维画像，不计算总分。" : "7 分表示合格且清楚；信息充分程度不参与总分。"}</p>
              </div>
              <div className={`review-total ${reviewMode}`}>
                <strong>{reviewMode === "qualitative" ? (attempt ? "已评阅" : "—") : aiTotal == null ? "—" : aiTotal.toFixed(1)}</strong>
                <small>{reviewMode === "qualitative" ? "质性画像" : "六维平均 / 10"}</small>
              </div>
            </div>
            <div className="review-meta"><span>PROVIDER: {provider}</span><span>MODEL: {model}</span><span>PROMPT: {promptVersion}</span><span>RUBRIC: {rubricVersion}</span><span>RUN: {attempt || 0}/3</span></div>
            <AiReviewAction
              submissionVersionId={submissionVersionId}
              completedCount={completedCount}
              activeStatus={activeStatus}
              lastError={lastError}
              configured={Boolean(process.env.DEEPSEEK_API_KEY?.trim())}
            />
          </div>
          <div className="review-body">
            {reviewSummary && <p className="review-summary">{reviewSummary}</p>}
            {progressSummary && (
              <div className="review-progress">
                <div><span>记录的工作</span><p>{progressSummary.documentedWork.join("；") || "文中未说明"}</p></div>
                <div><span>推进或完成</span><p>{progressSummary.completedOrAdvanced.join("；") || "文中未说明"}</p></div>
                <div><span>受阻、变化或待判断</span><p>{progressSummary.blockedChangedOrInconclusive.join("；") || "无单独记录"}</p></div>
                <div><span>与月初计划</span><p>{progressSummary.planAlignment || "未提供月初计划或文中未说明"}</p></div>
              </div>
            )}
            <div className="radar-and-scores"><div className="radar-wrap"><ReviewRadar dimensions={dimensions} maxScore={reviewMode === "qualitative" ? 4 : 10} /></div><div className="score-list">{dimensions.map((dimension) => <div className="dimension-row" key={dimension.key}><label>{dimension.name}</label><strong>{dimension.scale === "qualitative" ? dimension.levelLabel : dimension.score ? dimension.score.toFixed(Number.isInteger(dimension.score) ? 0 : 1) : "—"}</strong><div><span style={{ width: `${Math.max(0, Math.min(100, dimension.score / dimension.maxScore * 100))}%` }} /></div></div>)}</div></div>
            <ReviewDimensionDetails dimensions={dimensions} />
            <div className="review-block"><h3><span />做得好的地方</h3>{strengths.length ? <ul>{strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="empty-copy">AI 评阅尚未生成。</p>}</div>
            <div className="review-block warning"><h3><span />主要不足与下一步</h3>{improvements.length ? improvements.map((item, index) => <p key={`${index}-${item}`}>{item}</p>) : <p className="empty-copy">AI 评阅尚未生成。</p>}</div>
            {uncertaintyNotes.length > 0 && <div className="review-block uncertainty"><h3><span />信息限制</h3>{uncertaintyNotes.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</div>}
            {workBlocks.length > 0 && <details className="review-details"><summary>查看工作区块</summary>{workBlocks.map((block, index) => <div key={`${block.title}-${index}`}><strong>{block.title}</strong><span>{block.outcome}</span><p>{block.summary}</p></div>)}</details>}
            {rawReview && <details className="review-details raw-review"><summary>查看原始 AI 结果</summary><pre>{JSON.stringify(rawReview, null, 2)}</pre></details>}
            {isTeacher ? <TeacherReviewForm submissionVersionId={submissionVersionId} initialScore={mentorScore ?? 8.5} initialComment={mentorScore == null ? "" : mentorComment} /> : <div className="mentor-box"><header><strong>导师评分与评语</strong><span>{mentorScore == null ? "待评语" : `${mentorScore.toFixed(1)} / 10`}</span></header><p>{mentorComment}</p></div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
