import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { InviteMemberForm } from "@/components/invite-member-form";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { CreateGroupForm } from "@/components/create-group-form";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { shortTime } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "课题组" };
export default async function GroupPage() {
  let groupId: string | null = null;
  let planDay = 5;
  let planTime = "23:59";
  let paperTime = "23:59";
  const session = await getCurrentMembership();
  if (session.membership?.role === "teacher") {
    groupId = session.membership.group_id;
    planDay = session.group?.plan_deadline_day || 5;
    planTime = shortTime(session.group?.plan_deadline_time);
    paperTime = shortTime(session.group?.paper_deadline_time);
  }
  if (!groupId) return <PlaceholderPage surface="teacher" eyebrow="导师端 / SETUP" title="创建课题组" description="这是首次设置，创建后当前账号会成为课题组导师。"><div className="setup-panel"><CreateGroupForm /></div></PlaceholderPage>;
  return <PlaceholderPage surface="teacher" eyebrow="导师端 / GROUP" title="课题组设置" description="成员邀请、邮件通知与月度规则。"><div className="group-layout"><section><div className="section-heading"><div><h2>邀请成员</h2><p>填写邮箱时会在创建邀请后自动发送邮件。</p></div></div><InviteMemberForm groupId={groupId} /></section><aside><div className="section-heading"><div><h2>月度规则</h2><p>修改后写入课题组设置。</p></div></div><GroupSettingsForm groupId={groupId} planDay={planDay} planTime={planTime} paperTime={paperTime} /></aside></div></PlaceholderPage>;
}
