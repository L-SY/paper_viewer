import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailPanel } from "@/components/verify-email-panel";

export const metadata: Metadata = { title: "验证邮箱" };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string | string[]; invite?: string | string[] }> }) {
  const query = await searchParams;
  const email = Array.isArray(query.email) ? query.email[0] : query.email;
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
  return <AuthShell eyebrow="邮箱验证" title="检查你的邮箱"><VerifyEmailPanel email={email || ""} invite={invite || ""} /></AuthShell>;
}
