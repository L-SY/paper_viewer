export type StudentStatus = "missing" | "submitted" | "awaiting" | "completed";

export type DemoStudent = {
  id: string;
  name: string;
  initials: string;
  topic: string;
  planDone: boolean;
  version: number | null;
  aiScore: number | null;
  mentorScore: number | null;
  status: StudentStatus;
};

export const students: DemoStudent[] = [
  { id: "chen-yuhang", name: "陈雨航", initials: "陈", topic: "轮腿机器人 · 博士二年级", planDone: true, version: 2, aiScore: 8.2, mentorScore: 8.5, status: "completed" },
  { id: "zhou-siqi", name: "周思琪", initials: "周", topic: "多模态感知 · 硕士二年级", planDone: true, version: 1, aiScore: 7.6, mentorScore: null, status: "awaiting" },
  { id: "wang-zeyu", name: "王泽宇", initials: "王", topic: "灵巧操作 · 博士一年级", planDone: true, version: 3, aiScore: 8.7, mentorScore: null, status: "awaiting" },
  { id: "liu-anning", name: "刘安宁", initials: "刘", topic: "强化学习 · 硕士一年级", planDone: true, version: 1, aiScore: null, mentorScore: null, status: "submitted" },
  { id: "zhao-qiming", name: "赵启明", initials: "赵", topic: "探索阶段 · 硕士一年级", planDone: false, version: null, aiScore: null, mentorScore: null, status: "missing" },
  { id: "sun-yixuan", name: "孙逸轩", initials: "孙", topic: "运动控制 · 博士三年级", planDone: true, version: 2, aiScore: 7.9, mentorScore: 8.0, status: "completed" },
];
