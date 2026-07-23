import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = { title: "设置新密码" };
export default function ResetPasswordPage() {
  return <AuthShell eyebrow="密码" title="设置新密码"><ResetPasswordForm /></AuthShell>;
}
