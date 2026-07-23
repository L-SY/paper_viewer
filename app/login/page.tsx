import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "登录" };

type Query = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function LoginPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const requestedMode = first(query.mode);
  const initialMode = requestedMode === "signup" || requestedMode === "forgot" ? requestedMode : "signin";
  const callbackError = first(query.error);
  const initialMessage = callbackError === "verification_failed" ? "邮箱验证链接无效或已经过期，请重新发送。" : callbackError === "invalid_callback" ? "登录链接不完整，请重新操作。" : null;
  return (
    <AuthShell eyebrow="账号" title="进入 PaperView">
      <AuthForm initialMode={initialMode} initialInvite={first(query.invite) || ""} next={first(query.next) || "/"} initialMessage={initialMessage} />
    </AuthShell>
  );
}
