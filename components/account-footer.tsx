"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AccountFooter({ configured, displayName, email, role }: { configured: boolean; displayName: string; email: string; role: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const initials = displayName.slice(0, 2).toUpperCase();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return router.push("/login");
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="user-chip" title={email}>
      <span className="avatar small">{initials}</span>
      <Link href="/profile"><strong>{displayName}</strong><small>{role}</small></Link>
      <button type="button" onClick={signOut} disabled={loading} aria-label={configured ? "退出登录" : "打开登录页"}>{loading ? "…" : configured ? "退出" : "登录"}</button>
    </div>
  );
}
