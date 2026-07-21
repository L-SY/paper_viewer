"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function InviteMemberForm({ groupId }: { groupId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !groupId) return setMessage("当前是演示模式，连接 Supabase 并建立课题组后即可创建邀请。");
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.rpc("create_group_invitation", {
      target_group_id: groupId,
      invited_email: String(form.get("email") ?? "").trim() || null,
      member_role: String(form.get("role") ?? "student"),
      expires_in_hours: 168,
    });
    setLoading(false);
    if (error || typeof data !== "string") return setMessage(error?.message || "邀请码创建失败。");
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("mode", "signup");
    url.searchParams.set("invite", data);
    setInviteUrl(url.toString());
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setMessage("邀请链接已复制。");
  }

  return <form className="invite-form" onSubmit={createInvite}><div><label>限定邮箱 <span className="optional">留空则任何收到链接的人可使用</span><input className="text-input" name="email" type="email" placeholder="student@example.com" /></label><label>成员身份<select className="text-input" name="role" defaultValue="student"><option value="student">学生</option><option value="teacher">导师</option></select></label></div><button className="button button-primary" type="submit" disabled={loading}>{loading ? "创建中…" : "创建 7 天邀请链接"}</button>{inviteUrl && <div className="invite-result"><input className="text-input mono" readOnly value={inviteUrl} aria-label="邀请链接" /><button className="button button-secondary" type="button" onClick={copyInvite}>复制</button></div>}{message && <div className="form-message" role="status">{message}</div>}</form>;
}
