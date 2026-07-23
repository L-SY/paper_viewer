import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "评分趋势" };
export default function TrendsPage() {
  return <PlaceholderPage eyebrow="评分记录" title="评分趋势"><p className="empty-copy">暂无趋势数据。</p></PlaceholderPage>;
}
