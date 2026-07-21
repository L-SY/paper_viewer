import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReviewRadar } from "@/components/review-radar";
import { reviewDimensions } from "@/lib/review-dimensions";
import { TeacherReviewForm } from "@/components/teacher-review-form";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export const metadata: Metadata = { title: "论文评阅" };
type ReviewDimension = { key: string; short: string; name: string; score: number };

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
  let aiTotal: number | null = 8.2;
  let provider = "OpenAI";
  let model = "GPT-5.2";
  let promptVersion = "v0.3.1";
  let rubricVersion = "v1.0";
  let attempt = 2;
  let dimensions: ReviewDimension[] = reviewDimensions.map((dimension) => ({ ...dimension }));
  let strengths = [
    "研究问题收敛到可在一个月内验证的小问题，目标、基线和判断标准基本对应。",
    "如实报告软地面场景未获得稳定改善，并提出可能的摩擦模型影响，没有把局部结果过度包装成成功。",
  ];
  let improvements = ["目前只报告汇总误检率，缺少每个场景的样本量、方差或置信区间。建议下月优先补齐逐场景统计，并明确软地面实验中摩擦参数的设置范围。"];
  let mentorScore: number | null = 8.5;
  let mentorComment = "这个月的问题拆得比较合适，也敢于保留没有改善的结果。下个月先不要急着扩展网络结构，把软地面下的误差来源拆清楚；建议补一个真实平台上的小规模对照。";

  if (session.configured) {
    if (!session.user || !uuidPattern.test(id)) notFound();
    submissionVersionId = id;
    const { data: version } = await session.supabase.from("submission_versions").select("id, monthly_record_id, version_number, title, storage_path, original_filename, size_bytes, page_count, submitted_at").eq("id", id).maybeSingle();
    if (!version) notFound();
    const { data: record } = await session.supabase.from("monthly_records").select("student_id, research_month").eq("id", version.monthly_record_id).maybeSingle();
    if (!record) notFound();
    const [{ data: profile }, { data: ai }, { data: teacher }, signed] = await Promise.all([
      session.supabase.from("profiles").select("display_name").eq("id", record.student_id).maybeSingle(),
      session.supabase.from("ai_reviews").select("attempt_number, provider, model, prompt_version, rubric_version, dimension_scores, total_score, strengths, weaknesses, suggestions").eq("submission_version_id", id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      session.supabase.from("teacher_reviews").select("score, comment").eq("submission_version_id", id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      session.supabase.storage.from("monthly-papers").createSignedUrl(version.storage_path, 3600),
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
    const dimensionSource = ai?.dimension_scores && typeof ai.dimension_scores === "object" ? ai.dimension_scores as Record<string, unknown> : {};
    dimensions = reviewDimensions.map((dimension) => {
      const raw = dimensionSource[dimension.key];
      const value = typeof raw === "number" ? raw : raw && typeof raw === "object" && "score" in raw ? Number((raw as { score: unknown }).score) : 0;
      return { ...dimension, score: Number.isFinite(value) ? value : 0 };
    });
    strengths = asTextList(ai?.strengths);
    improvements = [...asTextList(ai?.weaknesses), ...asTextList(ai?.suggestions)];
    mentorScore = teacher?.score == null ? null : Number(teacher.score);
    mentorComment = teacher?.comment || "导师尚未给出本月评语。";
  }

  const homeHref = isTeacher ? "/teacher" : "/student";
  return (
    <AppShell>
      <nav className="breadcrumb" aria-label="面包屑"><Link href={homeHref}>本月总览</Link><span>/</span><span>{studentName}</span><span>/</span><strong>论文评阅</strong></nav>
      <header className="page-header"><div><div className="eyebrow">{compactMonth} / VERSION {versionNumber}</div><h1>{paperTitle}</h1><p>{studentName} · {monthLabel}月度论文 · {submittedLabel} 提交</p></div><div className="header-actions">{pdfUrl ? <a className="button button-secondary" href={pdfUrl} download={filename}>下载原始 PDF</a> : <button className="button button-secondary" type="button" disabled>下载原始 PDF</button>}<button className="button button-primary" type="button" disabled title="将在档案导出阶段开放">导出评阅报告</button></div></header>

      <div className="paper-layout">
        <section className="paper-panel" aria-label="PDF 在线预览"><div className="panel-toolbar"><div><strong>{filename}</strong><span>{pageCount} pages · {sizeMb} MB</span></div>{pdfUrl && <a className="text-link" href={pdfUrl} target="_blank" rel="noreferrer">新窗口打开</a>}</div><div className="pdf-stage">{pdfUrl ? <iframe className="pdf-embed" src={`${pdfUrl}#toolbar=1&navpanes=0`} title={`${paperTitle} PDF 预览`} /> : <article className="pdf-page"><h2>{paperTitle}</h2><div className="authors">Yuhang Chen · E3 Laboratory</div><h3>Abstract</h3><p>针对轮腿机器人在非结构化地形中接触状态难以稳定估计的问题，本月工作构建了一套基于足端运动残差与电机电流信息的轻量估计流程，并在仿真环境中完成初步消融验证。</p><h3>I. Introduction</h3><p>本月研究的目标不是提出完整的新算法，而是回答一个更小的问题：组合运动学残差和电机电流能否降低单一阈值的误检率？</p><div className="figure-placeholder">Fig. 1. Contact estimation pipeline and experimental setup</div><h3>II. Method</h3><p>方法包含时间对齐、特征归一化、候选接触窗口检测与置信度融合四个步骤。</p><h3>III. Preliminary Results</h3><p>融合方法降低了高速步态下的误检，但慢速软地面场景没有稳定改善。</p></article>}</div></section>

        <section className="review-panel" aria-label="评阅详情"><div className="review-header"><div className="review-header-top"><div><h2>AI 六维评阅</h2><p>统一规范生成，导师评分独立保留。</p></div><div className="review-total"><strong>{aiTotal == null ? "—" : aiTotal.toFixed(1)}</strong><small>六维平均 / 10</small></div></div><div className="review-meta"><span>PROVIDER: {provider}</span><span>MODEL: {model}</span><span>PROMPT: {promptVersion}</span><span>RUBRIC: {rubricVersion}</span><span>RUN: {attempt || 0}/3</span></div></div><div className="review-tabs"><span className="active">综合评阅</span><span>证据记录</span><span>原始输出</span></div><div className="review-body"><div className="radar-and-scores"><div className="radar-wrap"><ReviewRadar dimensions={dimensions} /></div><div className="score-list">{dimensions.map((dimension) => <div className="dimension-row" key={dimension.key}><label>{dimension.name}</label><strong>{dimension.score ? dimension.score.toFixed(1) : "—"}</strong><div><span style={{ width: `${dimension.score * 10}%` }} /></div></div>)}</div></div><div className="review-block"><h3><span />做得好的地方</h3>{strengths.length ? <ul>{strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="empty-copy">AI 评阅尚未生成。</p>}</div><div className="review-block warning"><h3><span />主要不足与下一步</h3>{improvements.length ? improvements.map((item, index) => <p key={`${index}-${item}`}>{item}</p>) : <p className="empty-copy">AI 评阅尚未生成。</p>}</div>{isTeacher ? <TeacherReviewForm submissionVersionId={submissionVersionId} initialScore={mentorScore ?? 8.5} initialComment={mentorScore == null ? "" : mentorComment} /> : <div className="mentor-box"><header><strong>导师评分与评语</strong><span>{mentorScore == null ? "待评语" : `${mentorScore.toFixed(1)} / 10`}</span></header><p>{mentorComment}</p></div>}</div></section>
      </div>
    </AppShell>
  );
}
