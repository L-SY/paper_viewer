"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function JoinGroupForm({ initialInvite = "" }: { initialInvite?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const invitationToken = String(form.get("invite") ?? "").trim();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setMessage("尚未连接 Supabase，暂时不能加入课题组。");
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: invitationToken }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setLoading(false);
      return setMessage(result.error || "加入课题组失败。");
    }
    await supabase.auth.updateUser({ data: { preferred_role: "student" } });
    setLoading(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <form className="profile-form join-group-form" onSubmit={submit}>
      <div className="form-section">
        <label className="field-label" htmlFor="join-group-invite">课题组邀请码</label>
        <input id="join-group-invite" className="text-input full-input mono" name="invite" defaultValue={initialInvite} placeholder="例如 PV-ABCD-EFGH-JKLM" autoComplete="off" required />
      </div>
      {message && <div className="form-message" role="status">{message}</div>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? "加入中…" : "加入课题组"}</button>
    </form>
  );
}
