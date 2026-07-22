"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "forgot";
type SignupRole = "student" | "teacher";

function friendlyAuthError(message: string) {
  if (message.includes("Invalid login credentials")) return "邮箱或密码不正确。";
  if (message.includes("Email not confirmed")) return "请先完成邮箱验证。";
  if (message.includes("User already registered")) return "这个邮箱已经注册，可以直接登录。";
  if (message.includes("Password should be")) return "密码至少需要 8 位。";
  if (message.includes("rate limit")) return "操作过于频繁，请稍后再试。";
  return message;
}

export function AuthForm({ initialMode = "signin", initialInvite = "", next = "/", initialMessage = null }: { initialMode?: AuthMode; initialInvite?: string; next?: string; initialMessage?: string | null }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: boolean } | null>(initialMessage ? { text: initialMessage } : null);
  const router = useRouter();

  function switchMode(value: AuthMode) {
    setMode(value);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage({ text: "尚未连接 Supabase。当前可以继续浏览演示工作台。" });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (mode === "forgot") {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      setLoading(false);
      if (error) return setMessage({ text: friendlyAuthError(error.message) });
      return setMessage({ text: "重置链接已发送，请检查邮箱。", success: true });
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return setMessage({ text: friendlyAuthError(error.message) });
      }
      const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      window.location.replace(destination);
      return;
    }

    const displayName = String(form.get("displayName") ?? "").trim();
    const preferredRole = (form.get("preferredRole") === "teacher" ? "teacher" : "student") satisfies SignupRole;
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    const invite = String(form.get("invite") ?? "").trim();
    if (password !== confirmation) {
      setLoading(false);
      return setMessage({ text: "两次输入的密码不一致。" });
    }

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/onboarding");
    if (invite) callback.searchParams.set("invite", invite);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, preferred_role: preferredRole },
        emailRedirectTo: callback.toString(),
      },
    });
    setLoading(false);
    if (error) return setMessage({ text: friendlyAuthError(error.message) });
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return setMessage({ text: "这个邮箱已经注册。请直接登录，或使用“忘记密码”找回账号。" });
    }
    const verifyUrl = new URL("/verify-email", window.location.origin);
    verifyUrl.searchParams.set("email", email);
    if (invite) verifyUrl.searchParams.set("invite", invite);
    router.push(`${verifyUrl.pathname}${verifyUrl.search}`);
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" && <label>姓名<input className="text-input" type="text" name="displayName" placeholder="在组内显示的姓名" autoComplete="name" maxLength={40} required /></label>}
        {mode === "signup" && <fieldset className="role-choice"><legend>注册身份</legend><div><label><input type="radio" name="preferredRole" value="student" defaultChecked /><span><strong>学生</strong><small>加入导师创建的课题组</small></span></label><label><input type="radio" name="preferredRole" value="teacher" /><span><strong>导师</strong><small>创建并管理课题组</small></span></label></div><p>用于确定首次进入的工作台；组内权限仍由课题组身份决定。</p></fieldset>}
        <label>邮箱<input className="text-input" type="email" name="email" placeholder="name@example.com" autoComplete="email" required /></label>
        {mode !== "forgot" && (
          <label>
            <span className="label-row"><span>密码</span>{mode === "signin" && <button type="button" onClick={() => switchMode("forgot")}>忘记密码</button>}</span>
            <input className="text-input" type="password" name="password" placeholder={mode === "signup" ? "至少 8 位" : "输入密码"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          </label>
        )}
        {mode === "signup" && <label>确认密码<input className="text-input" type="password" name="passwordConfirmation" placeholder="再次输入密码" minLength={8} autoComplete="new-password" required /></label>}
        {mode === "signup" && <label>课题组邀请码 <span className="optional">可稍后填写</span><input className="text-input mono" type="text" name="invite" defaultValue={initialInvite} placeholder="由导师提供" autoComplete="off" /></label>}
        {mode === "signup" && <label className="consent-row"><input type="checkbox" required /><span>我已阅读并同意 <Link href="/privacy" target="_blank">隐私与组内公开说明</Link></span></label>}
        {message && <div className={`form-message${message.success ? " success" : ""}`} role="status">{message.text}</div>}
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? "处理中…" : mode === "signin" ? "登录" : mode === "signup" ? "创建账号" : "发送重置链接"}</button>
      </form>
      <div className="auth-switch">
        {mode === "signin" && <>还没有账号？<button type="button" onClick={() => switchMode("signup")}>注册</button></>}
        {mode === "signup" && <>已经有账号？<button type="button" onClick={() => switchMode("signin")}>登录</button></>}
        {mode === "forgot" && <button type="button" onClick={() => switchMode("signin")}>返回登录</button>}
      </div>
      <div className="auth-note">支持 Gmail、Outlook、QQ 和学校邮箱。注册后需验证邮箱，加入课题组仍需要导师邀请。<br /><Link className="text-link" href="/">浏览演示工作台 →</Link></div>
    </>
  );
}
