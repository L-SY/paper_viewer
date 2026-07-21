import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "论文档案" };
export default function ArchivePage() {
  return <PlaceholderPage eyebrow="ARCHIVE" title="论文档案" description="按学生、月份和状态检索组内全部月度论文，毕业成员的记录将以只读方式保留。"><div className="table-wrap"><table className="data-table"><thead><tr><th>月份</th><th>学生</th><th>论文标题</th><th>版本</th><th>AI</th><th>导师</th><th /></tr></thead><tbody><tr><td className="mono">2026.07</td><td>陈雨航</td><td>面向轮腿机器人的接触状态估计方法探索</td><td className="mono">v2</td><td className="score">8.2</td><td className="score">8.5</td><td className="action-cell"><Link className="text-link" href="/papers/chen-yuhang">查看</Link></td></tr><tr><td className="mono">2026.06</td><td>陈雨航</td><td>接触检测基线与仿真环境搭建</td><td className="mono">v3</td><td className="score">7.7</td><td className="score">8.0</td><td className="action-cell"><button className="text-link" type="button">查看</button></td></tr></tbody></table></div></PlaceholderPage>;
}
