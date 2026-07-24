"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewRunStatus = "queued" | "running" | "completed" | "failed";

export function AiReviewAction({
  submissionVersionId,
  completedCount,
  activeStatus,
  lastError,
  configured,
}: {
  submissionVersionId: string | null;
  completedCount: number;
  activeStatus: ReviewRunStatus | null;
  lastError: string | null;
  configured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const limitReached = completedCount >= 3;
  const active = activeStatus === "queued" || activeStatus === "running";
  const disabled = !submissionVersionId || !configured || limitReached || active || loading;

  async function startReview() {
    if (!submissionVersionId || disabled) return;
    setLoading(true);
    setMessage("正在提取 PDF 并生成评阅，请保持页面打开。");
    try {
      const response = await fetch("/api/ai-reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionVersionId, language: "zh" }),
      });
      const result = await response.json().catch(() => null) as {
        error?: string;
        attemptNumber?: number;
      } | null;
      if (!response.ok) {
        setMessage(result?.error || "AI 评阅未能完成，请稍后重试。");
        return;
      }
      setMessage(`第 ${result?.attemptNumber || completedCount + 1} 次评阅已完成。`);
      router.refresh();
    } catch {
      setMessage("连接中断。后台若仍在评阅，稍后刷新页面即可查看。");
    } finally {
      setLoading(false);
    }
  }

  let buttonLabel = completedCount ? `再次评阅 · ${completedCount}/3` : "开始 AI 评阅";
  if (loading || active) buttonLabel = "AI 评阅中…";
  if (limitReached) buttonLabel = "已完成 3 次评阅";
  if (!configured) buttonLabel = "AI 服务未配置";

  return (
    <div className="ai-review-action">
      <button className="button button-primary" type="button" disabled={disabled} onClick={startReview}>
        {buttonLabel}
      </button>
      {(message || (!active && lastError)) && (
        <span className="ai-review-message" role="status">
          {message || lastError}
        </span>
      )}
    </div>
  );
}
