"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function VerifyEmailPanel({ email, invite }: { email: string; invite: string }) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function resend() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setState("error");
    setState("loading");
    setErrorMessage("");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/onboarding");
    if (invite) callback.searchParams.set("invite", invite);
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback.toString() } });
    if (error) {
      setErrorMessage(error.message.toLowerCase().includes("rate limit") ? "发送过于频繁，请稍后再试。" : "发送失败，请稍后重试或联系导师。");
      setState("error");
      return;
    }
    setState("sent");
  }

  return <div className="verification-panel"><div className="mail-mark">@</div><strong>{email || "你的邮箱"}</strong><p>点击邮件中的验证链接后，即可完善个人资料并加入课题组。邮件可能需要一两分钟到达，也请检查垃圾邮件目录。</p><button className="button button-secondary" type="button" onClick={resend} disabled={!email || state === "loading"}>{state === "loading" ? "发送中…" : state === "sent" ? "已重新发送" : "重新发送邮件"}</button>{state === "error" && <div className="form-message">{errorMessage || "暂时无法发送，请稍后再试。"}</div>}<Link className="text-link" href="/login">返回登录</Link></div>;
}
