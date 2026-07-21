"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CreateGroupForm({ initialName = "E3-121" }: { initialName?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("groupName") ?? "").trim();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setMessage("尚未连接 Supabase。");
    if (name.length < 2) return setMessage("课题组名称至少需要 2 个字符。");
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.rpc("create_teacher_group", { group_name: name });
    setLoading(false);
    if (error) return setMessage(error.message);
    router.replace("/teacher");
    router.refresh();
  }

  return <form className="profile-form" onSubmit={submit}><div className="form-section"><label className="field-label" htmlFor="group-name">课题组名称</label><input id="group-name" className="text-input full-input" name="groupName" defaultValue={initialName} minLength={2} maxLength={80} required /><p className="form-help">创建后当前账号会成为该组导师，可以继续邀请学生和其他导师。</p></div>{message && <div className="form-message" role="status">{message}</div>}<button className="button button-primary" type="submit" disabled={loading}>{loading ? "创建中…" : "创建课题组"}</button></form>;
}
