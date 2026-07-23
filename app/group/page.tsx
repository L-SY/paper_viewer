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
    return <PlaceholderPage surface="student" eyebrow="学生端 / 课题组" title={session.group?.name || "当前课题组"}><p className="empty-copy">当前身份：学生</p></PlaceholderPage>;
  }
  if (!groupId) {
    const preferredRole = session.user?.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
    if (preferredRole === "student") return <PlaceholderPage surface="student" eyebrow="学生端 / 设置" title="加入课题组"><div className="setup-panel"><JoinGroupForm initialInvite={initialInvite || ""} /></div></PlaceholderPage>;
    return <PlaceholderPage surface="teacher" eyebrow="导师端 / 设置" title="创建课题组"><div className="setup-panel"><CreateGroupForm /></div></PlaceholderPage>;
  }
  return (
    <PlaceholderPage surface="teacher" eyebrow="导师端 / 课题组" title="课题组设置">
      <div className="group-layout">
        <section>
          <div className="section-heading"><h2>邀请成员</h2></div>
          <InviteMemberForm groupId={groupId} />
        </section>
        <section>
          <div className="section-heading"><h2>月度规则</h2></div>
          <GroupSettingsForm groupId={groupId} planDay={planDay} planTime={planTime} paperTime={paperTime} />
        </section>
      </div>
    </PlaceholderPage>
  );
}
