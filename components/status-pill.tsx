import type { StudentStatus } from "@/lib/demo-data";

const labels: Record<StudentStatus, string> = {
  missing: "未提交",
  submitted: "已提交",
  awaiting: "待评语",
  completed: "已完成",
};

export function StatusPill({ status }: { status: StudentStatus }) {
  return <span className={`status-pill ${status}`}>{labels[status]}</span>;
}
