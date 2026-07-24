export const reviewDimensions = [
  { key: "goal", resultKey: "research_goal", short: "目标", name: "研究问题与目标", score: 9 },
  { key: "logic", resultKey: "logic_structure", short: "逻辑", name: "逻辑与结构", score: 8 },
  { key: "method", resultKey: "method_reasonableness", short: "方法", name: "方法合理性", score: 8 },
  { key: "evidence", resultKey: "evidence_conclusion", short: "证据", name: "证据与结论", score: 7 },
  { key: "reflection", resultKey: "analysis_reflection", short: "反思", name: "结果分析与反思", score: 8 },
  { key: "writing", resultKey: "academic_writing", short: "表达", name: "表达与学术规范", score: 8 },
] as const;

export const qualitativeReviewDimensions = [
  { key: "problem_goal", resultKey: "problem_goal", short: "目标", name: "问题与目标", score: 3 },
  { key: "process_decision", resultKey: "process_decision", short: "过程", name: "过程与决策", score: 3 },
  { key: "evidence_support", resultKey: "evidence_support", short: "证据", name: "证据支持", score: 3 },
  { key: "logic_boundary", resultKey: "logic_boundary", short: "逻辑", name: "逻辑与边界", score: 3 },
  { key: "interpretation_update", resultKey: "interpretation_update", short: "认识", name: "解释与认识更新", score: 3 },
  { key: "next_decision", resultKey: "next_decision", short: "决策", name: "后续决策", score: 3 },
] as const;
