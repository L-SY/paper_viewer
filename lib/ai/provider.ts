import type { AiReview } from "./review-schema";

export type ReviewRequest = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: "paper_view_monthly_review";
};

export type ReviewResponse = {
  review: AiReview;
  provider: string;
  model: string;
  rawOutput: unknown;
};

/**
 * Provider adapters keep model-specific API calls outside the scoring rules.
 * This lets experiments run the exact same versioned prompt across providers.
 */
export interface AiReviewProvider {
  readonly provider: string;
  readonly model: string;
  review(request: ReviewRequest): Promise<ReviewResponse>;
}
