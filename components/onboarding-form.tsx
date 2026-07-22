"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OnboardingRole = "student" | "teacher";

export function OnboardingForm({ initialInvite = "", initialDisplayName = "", initialDiscipline = "", initialResearchStage = "exploring", initialRole = "student" }: { initialInvite?: string; initialDisplayName?: string; initialDiscipline?: string; initialResearchStage?: string; initialRole?: OnboardingRole }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setMessage("尚未连接 Supabase，暂时不能保存资料。");
    setLoading(true);
    setMessage(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      return router.replace("/login");
    }

    const profile = {
      display_name: String(form.get("displayName") ?? "").trim(),
      discipline: String(form.get("discipline") ?? "").trim(),
      research_stage: String(form.get("researchStage") ?? "exploring"),
      onboarding_completed: true,
    };
    const preferredRole: OnboardingRole = form.get("preferredRole") === "teacher" ? "teacher" : "student";
    const { error: metadataError } = await supabase.auth.updateUser({ data: { preferred_role: preferredRole } });
    if (metadataError) {
      setLoading(false);
      return setMessage(metadataError.message);
    }
    const { error: profileError } = await supabase.from("profiles").update(profile).eq("id", user.id);
    if (profileError) {
      setLoading(false);
      return setMessage(profileError.message);
    }

    const invite = String(form.get("invite") ?? "").trim();
    if (invite) {
      const { error: inviteError } = await supabase.rpc("accept_group_invitation", { invitation_token: invite });
      if (inviteError) {
        setLoading(false);
        return setMessage(`个人资料已保存，但邀请码未生效：${inviteError.message}`);
      }
    }

    setLoading(false);
    router.replace(invite ? "/" : `/group?setup=${preferredRole}`);
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>姓名<input className="text-input" name="displayName" type="text" defaultValue={initialDisplayName} placeholder="在组内显示的姓名" maxLength={40} required /></label>
      <fieldset className="role-choice"><legend>主要身份</legend><div><label><input type="radio" name="preferredRole" value="student" defaultChecked={initialRole === "student"} /><span><strong>学生</strong><small>使用邀请码加入课题组</small></span></label><label><input type="radio" name="preferredRole" value="teacher" defaultChecked={initialRole === "teacher"} /><span><strong>导师</strong><small>创建或管理课题组</small></span></label></div></fieldset>
      <label>学科或研究方向<input className="text-input" name="discipline" type="text" defaultValue={initialDiscipline} placeholder="例如：机器人、材料、计算机视觉" maxLength={80} /></label>
      <label>当前阶段<select className="text-input" name="researchStage" defaultValue={initialResearchStage}><option value="exploring">探索阶段 / 尚未开题</option><option value="proposal">开题准备</option><option value="research">课题研究中</option><option value="writing">论文写作中</option></select></label>
      <label>课题组邀请码 <span className="optional">可稍后填写</span><input className="text-input mono" name="invite" type="text" defaultValue={initialInvite} placeholder="由导师提供" /></label>
      {message && <div className="form-message" role="status">{message}</div>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? "保存中…" : "完成设置"}</button>
    </form>
  );
}
