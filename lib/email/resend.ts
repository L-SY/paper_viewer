import { Resend } from "resend";

export type EmailResult = { sent: true; id: string } | { sent: false; reason: "not_configured" | "provider_error"; error?: string };

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string; text: string; idempotencyKey: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from, to: input.to, subject: input.subject, html: input.html, text: input.text }, { idempotencyKey: input.idempotencyKey });
  if (error || !data?.id) return { sent: false, reason: "provider_error", error: error?.message || "Unknown email provider error" };
  return { sent: true, id: data.id };
}
