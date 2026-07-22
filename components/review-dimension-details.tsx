export type ReviewConfidence = "high" | "medium" | "low" | null;

export type ReviewEvidence = {
  page: number;
  observation: string;
  kind: "fact" | "inference";
};

export type ReviewDimensionDetail = {
  key: string;
  short: string;
  name: string;
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
  evidence: ReviewEvidence[];
  nextAction: string;
  confidence: ReviewConfidence;
};

const confidenceLabels: Record<Exclude<ReviewConfidence, null>, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function ReviewDimensionDetails({ dimensions }: { dimensions: ReviewDimensionDetail[] }) {
  return (
    <div className="dimension-details" aria-label="六维评分解释">
      {dimensions.map((dimension) => {
        const hasDetails = Boolean(dimension.explanation || dimension.strengths.length || dimension.gaps.length || dimension.evidence.length || dimension.nextAction);
        return (
          <article className="dimension-detail-card" key={dimension.key}>
            <header>
              <div><span className="dimension-index">{dimension.short}</span><strong>{dimension.name}</strong></div>
              <div className="dimension-detail-meta">
                <span className={`confidence-badge ${dimension.confidence || "missing"}`}>本项信息充分程度 {dimension.confidence ? confidenceLabels[dimension.confidence] : "未记录"}</span>
                <strong>{dimension.score ? dimension.score.toFixed(Number.isInteger(dimension.score) ? 0 : 1) : "—"}<small> / 10</small></strong>
              </div>
            </header>
            {hasDetails ? (
              <div className="dimension-detail-body">
                {dimension.explanation && <p className="dimension-explanation">{dimension.explanation}</p>}
                {(dimension.strengths.length > 0 || dimension.gaps.length > 0) && (
                  <div className="dimension-findings">
                    <div><span>做得好的地方</span>{dimension.strengths.length ? <ul>{dimension.strengths.map((item, index) => <li key={`${dimension.key}-strength-${index}`}>{item}</li>)}</ul> : <p>本项未单独记录。</p>}</div>
                    <div><span>主要缺口</span>{dimension.gaps.length ? <ul>{dimension.gaps.map((item, index) => <li key={`${dimension.key}-gap-${index}`}>{item}</li>)}</ul> : <p>没有影响判断的主要缺口。</p>}</div>
                  </div>
                )}
                {dimension.evidence.length > 0 && <div className="dimension-evidence"><span>页码证据</span>{dimension.evidence.map((item, index) => <p key={`${dimension.key}-evidence-${index}`}><b>第 {item.page} 页 · {item.kind === "fact" ? "原文事实" : "评阅推断"}</b>{item.observation}</p>)}</div>}
                {dimension.nextAction && <div className="dimension-next-action"><span>优先行动</span><p>{dimension.nextAction}</p></div>}
              </div>
            ) : <p className="dimension-history-note">该历史评阅没有保存 v1.1 所需的逐维解释和信息充分程度。</p>}
          </article>
        );
      })}
    </div>
  );
}
