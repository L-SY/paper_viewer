import {
  PROMPT_VERSION as ENGLISH_PROMPT_VERSION,
  buildReviewSystemPrompt as buildEnglishReviewSystemPrompt,
  buildReviewUserPrompt as buildEnglishReviewUserPrompt,
} from "./review-prompt-en";
import {
  PROMPT_VERSION as CHINESE_PROMPT_VERSION,
  buildReviewSystemPrompt as buildChineseReviewSystemPrompt,
  buildReviewUserPrompt as buildChineseReviewUserPrompt,
} from "./review-prompt-zh";

export const RUBRIC_VERSION = "2.0.0";

export const PROMPT_VERSIONS = {
  en: ENGLISH_PROMPT_VERSION,
  zh: CHINESE_PROMPT_VERSION,
} as const;

export type ReviewPromptLanguage = keyof typeof PROMPT_VERSIONS;

export type ReviewPromptInput = {
  title: string;
  researchMonth: string;
  extractedPages: Array<{ page: number; text: string }>;
  monthlyPlan?: string | null;
  previousContext?: string | null;
};

export function buildReviewSystemPrompt(
  language: ReviewPromptLanguage = "en",
) {
  return language === "zh"
    ? buildChineseReviewSystemPrompt()
    : buildEnglishReviewSystemPrompt();
}

export function buildReviewUserPrompt(
  input: ReviewPromptInput,
  language: ReviewPromptLanguage = "en",
) {
  return language === "zh"
    ? buildChineseReviewUserPrompt(input)
    : buildEnglishReviewUserPrompt(input);
}

export {
  buildChineseReviewSystemPrompt,
  buildChineseReviewUserPrompt,
  buildEnglishReviewSystemPrompt,
  buildEnglishReviewUserPrompt,
};
