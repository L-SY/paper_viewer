"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmation") ?? "")) return setMessage("两次输入的密码不一致。");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setMessage("尚未连接 Supabase。");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage(error.message);
    await supabase.auth.signOut();
    router.replace("/login");
  }
  return <form className="auth-form" onSubmit={submit}><label>新密码<input className="text-input" type="password" name="password" minLength={8} autoComplete="new-password" required /></label><label>确认新密码<input className="text-input" type="password" name="confirmation" minLength={8} autoComplete="new-password" required /></label>{message && <div className="form-message">{message}</div>}<button className="button button-primary" type="submit" disabled={loading}>{loading ? "保存中…" : "保存新密码"}</button></form>;
}
