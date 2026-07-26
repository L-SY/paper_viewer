"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OnboardingRole = "student" | "teacher";

export function OnboardingForm({ initialInvite = "", initialDisplayName = "", initialDiscipline = "", initialRole = "student" }: { initialInvite?: string; initialDisplayName?: string; initialDiscipline?: string; initialRole?: OnboardingRole }) {
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
      const inviteResponse = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: invite }),
      });
      const inviteResult = await inviteResponse.json() as { error?: string };
      if (!inviteResponse.ok) {
        setLoading(false);
        return setMessage(`个人资料已保存，但邀请码未生效：${inviteResult.error || "请向导师确认邀请码"}`);
      }
      await supabase.auth.updateUser({ data: { preferred_role: "student" } });
    }

    setLoading(false);
    router.replace(invite ? "/" : `/group?setup=${preferredRole}`);
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>姓名<input className="text-input" name="displayName" type="text" defaultValue={initialDisplayName} placeholder="在组内显示的姓名" maxLength={40} required /></label>
      <fieldset className="role-choice"><legend>主要身份</legend><div><label><input type="radio" name="preferredRole" value="student" defaultChecked={initialRole === "student"} /><span><strong>学生</strong></span></label><label><input type="radio" name="preferredRole" value="teacher" defaultChecked={initialRole === "teacher"} /><span><strong>导师</strong></span></label></div></fieldset>
      <label>学科或研究方向<input className="text-input" name="discipline" type="text" defaultValue={initialDiscipline} placeholder="例如：机器人、材料、计算机视觉" maxLength={80} /></label>
      <label>课题组邀请码 <span className="optional">可稍后填写</span><input className="text-input mono" name="invite" type="text" defaultValue={initialInvite} placeholder="例如 PV-ABCD-EFGH-JKLM" autoComplete="off" /></label>
      {message && <div className="form-message" role="status">{message}</div>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? "保存中…" : "完成设置"}</button>
    </form>
  );
}
