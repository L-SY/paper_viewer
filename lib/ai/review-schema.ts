import { z } from "zod";

const evidenceSchema = z.object({
  page: z.number().int().positive(),
  observation: z.string().min(1),
  kind: z.enum(["fact", "inference"]),
});

const dimensionSchema = z.object({
  score: z.number().int().min(1).max(10),
  explanation: z.string().min(1),
  strengths: z.array(z.string().min(1)).max(2),
  gaps: z.array(z.string().min(1)).max(2),
  evidence: z.array(evidenceSchema).max(4),
  next_action: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const aiReviewSchema = z.object({
  research_goal: dimensionSchema,
  logic_structure: dimensionSchema,
  method_reasonableness: dimensionSchema,
  evidence_conclusion: dimensionSchema,
  analysis_reflection: dimensionSchema,
  academic_writing: dimensionSchema,
  strengths: z.array(z.string().min(1)).min(1).max(4),
  weaknesses: z.array(z.string().min(1)).min(1).max(3),
  suggestions: z.array(z.string().min(1)).min(1).max(3),
  uncertainty_notes: z.array(z.string().min(1)).max(4),
});

export type AiReview = z.infer<typeof aiReviewSchema>;

export function calculateAiAverage(review: AiReview) {
  const scores = [
    review.research_goal.score,
    review.logic_structure.score,
    review.method_reasonableness.score,
    review.evidence_conclusion.score,
    review.analysis_reflection.score,
    review.academic_writing.score,
  ];
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}
