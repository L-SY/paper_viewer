import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "课题组" };
export default function GroupPage() {
  return <PlaceholderPage eyebrow="E3 LAB / MEMBERS" title="课题组管理" description="导师通过邀请链接添加成员，并管理月度截止日期与毕业归档状态。"><div className="dashboard-lower"><section><div className="section-heading"><div><h2>成员邀请</h2><p>邀请链接只允许加入当前课题组，并设置有效期。</p></div><button className="button button-primary" type="button">创建邀请链接</button></div></section><section><dl className="settings-list"><div><dt>计划截止</dt><dd>每月 5日 23:59</dd></div><div><dt>论文截止</dt><dd>每月最后一天</dd></div><div><dt>时区</dt><dd className="mono">Asia/Shanghai</dd></div></dl></section></div></PlaceholderPage>;
}
