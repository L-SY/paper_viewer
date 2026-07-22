import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { InviteMemberForm } from "@/components/invite-member-form";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { CreateGroupForm } from "@/components/create-group-form";
import { JoinGroupForm } from "@/components/join-group-form";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { shortTime } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "课题组" };
export default async function GroupPage({ searchParams }: { searchParams: Promise<{ invite?: string | string[] }> }) {
  const query = await searchParams;
  const initialInvite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
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
  if (session.membership?.role === "student") {
    return <PlaceholderPage surface="student" eyebrow="学生端 / GROUP" title={session.group?.name || "当前课题组"} description="你的身份由导师邀请确定。学生可以查看组内论文与评价，但不能修改课题组设置。"><p className="empty-copy">如需更换课题组或调整身份，请联系导师处理成员档案。</p></PlaceholderPage>;
  }
  if (!groupId) {
    const preferredRole = session.user?.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
    if (preferredRole === "student") return <PlaceholderPage surface="student" eyebrow="学生端 / SETUP" title="加入课题组" description="账号已经建立，使用导师提供的邀请码加入课题组。"><div className="setup-panel"><JoinGroupForm initialInvite={initialInvite || ""} /></div></PlaceholderPage>;
    return <PlaceholderPage surface="teacher" eyebrow="导师端 / SETUP" title="创建课题组" description="这是首次设置，创建后当前账号会成为课题组导师。"><div className="setup-panel"><CreateGroupForm /></div></PlaceholderPage>;
  }
  return <PlaceholderPage surface="teacher" eyebrow="导师端 / GROUP" title="课题组设置" description="成员邀请、邮件通知与月度规则。"><div className="group-layout"><section><div className="section-heading"><div><h2>邀请成员</h2><p>填写邮箱时会在创建邀请后自动发送邮件。</p></div></div><InviteMemberForm groupId={groupId} /></section><aside><div className="section-heading"><div><h2>月度规则</h2><p>修改后写入课题组设置。</p></div></div><GroupSettingsForm groupId={groupId} planDay={planDay} planTime={planTime} paperTime={paperTime} /></aside></div></PlaceholderPage>;
}
