import * as reviewPrompt from "./review-prompt";
import type { AiReview } from "./review-schema";

type PromptLanguage = "zh" | "en";
type PromptInput = {
  title: string;
  researchMonth: string;
  extractedPages: Array<{ page: number; text: string }>;
  monthlyPlan?: string | null;
  previousContext?: string | null;
};

const promptModule = reviewPrompt as typeof reviewPrompt & {
  PROMPT_VERSION?: string;
  PROMPT_VERSIONS?: Partial<Record<PromptLanguage, string>>;
};

export function buildReviewPrompts(input: PromptInput, language: PromptLanguage = "zh") {
  const systemBuilder = reviewPrompt.buildReviewSystemPrompt as (language?: PromptLanguage) => string;
  const userBuilder = reviewPrompt.buildReviewUserPrompt as (
    input: PromptInput,
    language?: PromptLanguage,
  ) => string;
  return {
    systemPrompt: systemBuilder(language),
    userPrompt: userBuilder(input, language),
    promptVersion: promptModule.PROMPT_VERSIONS?.[language]
      || promptModule.PROMPT_VERSION
      || "unknown",
    rubricVersion: reviewPrompt.RUBRIC_VERSION,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function toStoredReviewFields(review: AiReview) {
  const root = review as unknown as Record<string, unknown>;
  const dimensions = asRecord(root.dimensions);
  if (dimensions) {
    const overall = asRecord(root.overall_feedback);
    const documentAssessment = asRecord(root.document_assessment);
    const suggestions = Object.values(dimensions).flatMap((dimension) => {
      const detail = asRecord(dimension);
      return typeof detail?.actionable_suggestion === "string"
        ? [detail.actionable_suggestion]
        : [];
    });
    return {
      dimension_scores: dimensions,
      total_score: null,
      strengths: asStringArray(overall?.strengths),
      weaknesses: asStringArray(overall?.growth_focus),
      suggestions: unique([
        ...suggestions,
        ...asStringArray(overall?.questions_for_student),
      ]),
      evidence: root.work_blocks || [],
      uncertainty_notes: unique([
        ...asStringArray(root.boundary_notes),
        ...asStringArray(documentAssessment?.notes),
      ]),
    };
  }

  const dimensionEntries = Object.entries(root).filter(([, value]) => {
    const detail = asRecord(value);
    return typeof detail?.score === "number";
  });
  const scores = dimensionEntries
    .map(([, value]) => Number(asRecord(value)?.score))
    .filter(Number.isFinite);
  return {
    dimension_scores: Object.fromEntries(dimensionEntries),
    total_score: scores.length
      ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2))
      : null,
    strengths: asStringArray(root.strengths),
    weaknesses: asStringArray(root.weaknesses),
    suggestions: asStringArray(root.suggestions),
    evidence: Object.fromEntries(dimensionEntries.map(([key, value]) => [
      key,
      asRecord(value)?.evidence || [],
    ])),
    uncertainty_notes: asStringArray(root.uncertainty_notes),
  };
}
