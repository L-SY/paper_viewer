"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: boolean } | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage({ text: "尚未配置 Supabase。可以先进入演示工作台查看完整界面。" });
      return;
    }

    setLoading(true);
    setMessage(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMessage({ text: error.message });
      router.replace("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) return setMessage({ text: error.message });
    setMessage({ text: "验证邮件已发送，请前往邮箱完成验证后登录。", success: true });
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>邮箱<input className="text-input" type="email" name="email" placeholder="name@example.com" autoComplete="email" required /></label>
        <label>密码<input className="text-input" type="password" name="password" placeholder={mode === "signup" ? "至少 8 位" : "输入你的密码"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
        {message && <div className={`form-message${message.success ? " success" : ""}`} role="status">{message.text}</div>}
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? "处理中…" : mode === "signin" ? "登录" : "创建账号"}</button>
      </form>
      <div className="auth-switch">{mode === "signin" ? "第一次使用？" : "已经有账号？"}<button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }}>{mode === "signin" ? "创建账号" : "返回登录"}</button></div>
      <div className="auth-note">支持 Gmail、Outlook、QQ 邮箱和学校邮箱。注册后需要验证邮箱；成员仍须通过导师的课题组邀请加入。<br /><Link className="text-link" href="/">进入演示工作台 →</Link></div>
    </>
  );
}
