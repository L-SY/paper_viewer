"use client";

import { useState, type FormEvent } from "react";

export function TeacherReviewForm({ submissionVersionId, initialScore = 8.5, initialComment = "" }: { submissionVersionId: string | null; initialScore?: number; initialComment?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: boolean } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionVersionId) return setMessage({ text: "当前是演示论文；接入真实版本后即可保存评语。" });
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/teacher-reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionVersionId, score: Number(form.get("score")), comment: String(form.get("comment") ?? "") }) });
    const result = await response.json() as { error?: string };
    setLoading(false);
    setMessage(response.ok ? { text: "导师评分和评语已经保存。", success: true } : { text: result.error || "保存失败。" });
  }
  return <form className="teacher-review-form" onSubmit={submit}><header><strong>导师独立评分</strong><span>不修改 AI 结果</span></header><label>总体评分 / 10<input className="text-input" name="score" type="number" min="0" max="10" step="0.1" defaultValue={initialScore} required /></label><label>评语<textarea className="text-area" name="comment" defaultValue={initialComment} placeholder="指出做得好的地方、主要不足和下个月最值得优先处理的事项。" required /></label>{message && <div className={`form-message${message.success ? " success" : ""}`}>{message.text}</div>}<button className="button button-primary" type="submit" disabled={loading}>{loading ? "保存中…" : "保存导师评语"}</button></form>;
}
