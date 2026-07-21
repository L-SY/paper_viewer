import { NextResponse } from "next/server";
import { z } from "zod";
import { invitationEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ groupId: z.string().uuid(), email: z.string().email().nullable(), role: z.enum(["teacher", "student"]) });

export async function POST(request: Request) {
  const session = await getCurrentMembership();
  if (!session.configured || !session.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (session.membership?.role !== "teacher") return NextResponse.json({ error: "只有导师可以创建邀请。" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || parsed.data.groupId !== session.membership.group_id) return NextResponse.json({ error: "邀请参数不正确。" }, { status: 400 });

  const { data: token, error } = await session.supabase.rpc("create_group_invitation", { target_group_id: parsed.data.groupId, invited_email: parsed.data.email, member_role: parsed.data.role, expires_in_hours: 168 });
  if (error || typeof token !== "string") return NextResponse.json({ error: error?.message || "邀请码创建失败。" }, { status: 400 });
  const inviteUrl = new URL("/login", request.url);
  inviteUrl.searchParams.set("mode", "signup");
  inviteUrl.searchParams.set("invite", token);

  let emailSent = false;
  let emailStatus = parsed.data.email ? "not_configured" : "not_requested";
  if (parsed.data.email) {
    const { data: group } = await session.supabase.from("groups").select("name").eq("id", parsed.data.groupId).single();
    const content = invitationEmail({ groupName: group?.name || "课题组", inviterName: session.profile?.display_name || "导师", inviteUrl: inviteUrl.toString() });
    const delivery = await sendTransactionalEmail({ to: parsed.data.email, ...content, idempotencyKey: `invite-${parsed.data.groupId}-${token.slice(0, 16)}` });
    emailSent = delivery.sent;
    emailStatus = delivery.sent ? "sent" : delivery.reason;
    const admin = createSupabaseAdminClient();
    if (admin) await admin.from("email_deliveries").insert({ group_id: parsed.data.groupId, recipient: parsed.data.email, kind: "group_invitation", idempotency_key: `invite-${parsed.data.groupId}-${token.slice(0, 16)}`, status: delivery.sent ? "sent" : "failed", provider_message_id: delivery.sent ? delivery.id : null, error_message: delivery.sent ? null : delivery.error || delivery.reason });
  }
  return NextResponse.json({ inviteUrl: inviteUrl.toString(), emailSent, emailStatus });
}
