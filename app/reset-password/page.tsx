import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = { title: "设置新密码" };
export default function ResetPasswordPage() {
  return <AuthShell eyebrow="PASSWORD" title="设置新密码" description="使用一个未在其他网站使用过的密码。"><ResetPasswordForm /></AuthShell>;
}
