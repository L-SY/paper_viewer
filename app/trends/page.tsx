import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "评分趋势" };
export default function TrendsPage() {
  return <PlaceholderPage eyebrow="LONGITUDINAL VIEW" title="评分趋势" description="跟踪六维评分、导师评分与评阅分歧随时间的变化，不将分数简单解释为科研能力排名。"><section className="cycle-strip"><div className="cycle-current"><span className="cycle-label">陈雨航 · 最近 6 个月</span><strong>AI 平均分 8.2</strong><span>较上月 +0.5</span></div><div className="cycle-steps"><p style={{ margin: 0, color: "var(--text-2)", fontSize: 11 }}>趋势图将在真实月度数据接入后展示；数据库已预留逐维度、模型分歧和提示词版本字段。</p></div></section></PlaceholderPage>;
}
