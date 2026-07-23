"use client";

import { useState, type FormEvent } from "react";

export function InviteMemberForm({ groupId }: { groupId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId) return setMessage("当前是演示模式，连接 Supabase 并建立课题组后即可创建邀请。");
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId, email: String(form.get("email") ?? "").trim() || null, role: String(form.get("role") ?? "student") }) });
    const result = await response.json() as { inviteUrl?: string; emailSent?: boolean; emailStatus?: string; error?: string };
    setLoading(false);
    if (!response.ok || !result.inviteUrl) return setMessage(result.error || "邀请码创建失败。");
    setInviteUrl(result.inviteUrl);
    setMessage(result.emailSent
      ? "邀请链接已创建并发送邮件。"
      : result.emailStatus === "not_requested"
        ? "邀请链接已创建。"
        : result.emailStatus === "provider_error"
          ? "邀请链接已创建，但邮件服务发送失败，请稍后重试。"
          : "邀请链接已创建，但邮件服务尚未配置。"
    );
  }

  async function copyInvite() { if (inviteUrl) { await navigator.clipboard.writeText(inviteUrl); setMessage("邀请链接已复制。"); } }

  return <form className="invite-form" onSubmit={createInvite}><div><label>受邀邮箱<input className="text-input" name="email" type="email" placeholder="student@example.com" /></label><label>成员身份<select className="text-input" name="role" defaultValue="student"><option value="student">学生</option><option value="teacher">导师</option></select></label></div><button className="button button-primary" type="submit" disabled={loading}>{loading ? "创建中…" : "创建 7 天邀请"}</button>{inviteUrl && <div className="invite-result"><input className="text-input mono" readOnly value={inviteUrl} aria-label="邀请链接" /><button className="button button-secondary" type="button" onClick={copyInvite}>复制</button></div>}{message && <div className="form-message" role="status">{message}</div>}</form>;
}
