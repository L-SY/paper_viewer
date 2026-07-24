import { z } from "zod";

const confidenceSchema = z.enum(["high", "medium", "low"]);

const evidenceSchema = z.object({
  page: z.number().int().positive(),
  quote: z.string(),
  observation: z.string().min(1),
  kind: z.enum(["fact", "inference"]),
});

const displayLevelSchema = z.enum([
  "needs_clarification",
  "basically_clear",
  "clear_and_sufficient",
  "deep_and_complete",
  "not_assessable",
]);

const levelCodeByDisplayLevel = {
  needs_clarification: 1,
  basically_clear: 2,
  clear_and_sufficient: 3,
  deep_and_complete: 4,
  not_assessable: null,
} as const;

const dimensionSchema = z
  .object({
    display_level: displayLevelSchema,
    level_code: z.number().int().min(1).max(4).nullable(),
    confidence: confidenceSchema,
    dimension_summary: z.string().min(1),
    what_is_clear: z.array(z.string().min(1)).max(2),
    what_needs_clarification: z.array(z.string().min(1)).max(2),
    evidence: z.array(evidenceSchema).max(4),
    actionable_suggestion: z.string(),
  })
  .superRefine((value, context) => {
    const expected = levelCodeByDisplayLevel[value.display_level];
    if (value.level_code !== expected) {
      context.addIssue({
        code: "custom",
        path: ["level_code"],
        message: `level_code must match display_level (${String(expected)})`,
      });
    }
  });

const activityTypeSchema = z.enum([
  "experiment",
  "engineering_design",
  "data_analysis",
  "theory_or_simulation",
  "literature_review",
  "troubleshooting_or_exploration",
  "planning_or_reflection",
  "other",
]);

const outcomeStateSchema = z.enum([
  "achieved",
  "partially_achieved",
  "negative_result",
  "failed_attempt",
  "inconclusive",
  "blocked",
  "redirected",
  "ongoing",
  "not_applicable",
  "unclear",
]);

const workBlockSchema = z.object({
  block_id: z.string().min(1),
  title: z.string().min(1),
  activity_types: z.array(activityTypeSchema).min(1).max(3),
  type_confidence: confidenceSchema,
  outcome_state: outcomeStateSchema,
  outcome_confidence: confidenceSchema,
  summary: z.string().min(1),
  evidence: z.array(evidenceSchema).max(4),
  plan_alignment: z.enum([
    "aligned",
    "partially_aligned",
    "changed",
    "new",
    "not_available",
    "unclear",
  ]),
});

export const aiReviewSchema = z.object({
  schema_version: z.literal("2.0.0"),
  document_assessment: z.object({
    status: z.enum(["reviewable", "partially_reviewable", "unreviewable"]),
    summary: z.string().min(1),
    missing_or_unreadable_pages: z.array(z.number().int().positive()),
    notes: z.array(z.string().min(1)),
  }),
  work_blocks: z.array(workBlockSchema).max(12),
  dimensions: z.object({
    problem_goal: dimensionSchema,
    process_decision: dimensionSchema,
    evidence_support: dimensionSchema,
    logic_boundary: dimensionSchema,
    interpretation_update: dimensionSchema,
    next_decision: dimensionSchema,
  }),
  progress_summary: z.object({
    plan_available: z.boolean(),
    documented_work: z.array(z.string().min(1)),
    completed_or_advanced: z.array(z.string().min(1)),
    blocked_changed_or_inconclusive: z.array(z.string().min(1)),
    plan_alignment_summary: z.string(),
    unverified_claims: z.array(z.string().min(1)),
  }),
  overall_feedback: z.object({
    summary: z.string().min(1),
    strengths: z.array(z.string().min(1)).max(4),
    growth_focus: z.array(z.string().min(1)).max(3),
    questions_for_student: z.array(z.string().min(1)).max(3),
  }),
  boundary_notes: z.array(z.string().min(1)).max(5),
});

export type AiReview = z.infer<typeof aiReviewSchema>;
