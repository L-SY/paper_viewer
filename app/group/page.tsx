import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";
import { InviteMemberForm } from "@/components/invite-member-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "课题组" };
export default async function GroupPage() {
  let groupId: string | null = null;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("group_members").select("group_id, role").eq("user_id", user.id).eq("status", "active").eq("role", "teacher").limit(1).maybeSingle();
      groupId = data?.group_id || null;
    }
  }
  return <PlaceholderPage eyebrow="E3 LAB" title="课题组" description="成员、邀请与月度规则。"><div className="group-layout"><section><div className="section-heading"><div><h2>邀请成员</h2><p>邀请码只保存哈希，原始链接仅在创建时显示一次。</p></div></div><InviteMemberForm groupId={groupId} /></section><aside><div className="section-heading"><div><h2>月度规则</h2></div></div><dl className="settings-list"><div><dt>计划截止</dt><dd>每月 5日 23:59</dd></div><div><dt>论文截止</dt><dd>每月最后一天</dd></div><div><dt>AI 评阅</dt><dd>最多 3 次</dd></div><div><dt>可见范围</dt><dd>组内公开</dd></div></dl></aside></div></PlaceholderPage>;
}
