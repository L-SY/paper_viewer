import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { createGroupInviteCode, isGroupInviteCode, normalizeGroupInviteCode } from "@/lib/group-invite-code";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ code: z.string().trim().min(4).max(128) });

export async function POST(request: Request) {
  const session = await getCurrentMembership();
  if (!session.configured || !session.user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效的课题组邀请码。" }, { status: 400 });
  }

  const code = normalizeGroupInviteCode(parsed.data.code);
  if (!isGroupInviteCode(code)) {
    const { data: groupId, error } = await session.supabase.rpc("accept_group_invitation", {
      invitation_token: parsed.data.code,
    });
    if (error || typeof groupId !== "string") {
      return NextResponse.json({ error: "邀请码无效或已失效。" }, { status: 400 });
    }
    return NextResponse.json({ groupId });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "服务器暂时无法验证邀请码。" }, { status: 503 });
  }

  const { data: groups, error: groupsError } = await admin.from("groups").select("id");
  if (groupsError) {
    return NextResponse.json({ error: "暂时无法读取课题组。" }, { status: 500 });
  }

  let targetGroupId: string | null = null;
  try {
    const candidates = await Promise.all((groups || []).map(async (group) => ({
      id: group.id as string,
      code: await createGroupInviteCode(group.id as string),
    })));
    targetGroupId = candidates.find((candidate) => candidate.code === code)?.id || null;
  } catch {
    return NextResponse.json({ error: "服务器暂时无法验证邀请码。" }, { status: 503 });
  }
  if (!targetGroupId) {
    return NextResponse.json({ error: "邀请码无效，请向导师确认。" }, { status: 400 });
  }

  const { data: memberships, error: membershipsError } = await admin
    .from("group_members")
    .select("group_id, role, status")
    .eq("user_id", session.user.id)
    .eq("status", "active");
  if (membershipsError) {
    return NextResponse.json({ error: "暂时无法检查课题组成员信息。" }, { status: 500 });
  }

  const existingTarget = (memberships || []).find((membership) => membership.group_id === targetGroupId);
  if (existingTarget?.role === "teacher") {
    return NextResponse.json({ error: "你已经是该课题组的导师。" }, { status: 409 });
  }
  if (existingTarget?.role === "student") {
    return NextResponse.json({ groupId: targetGroupId, alreadyJoined: true });
  }
  const otherStudentGroup = (memberships || []).find((membership) => membership.role === "student");
  if (otherStudentGroup) {
    return NextResponse.json({ error: "当前账号已经加入其他课题组。" }, { status: 409 });
  }

  const { error: insertError } = await admin.from("group_members").insert({
    group_id: targetGroupId,
    user_id: session.user.id,
    role: "student",
    status: "active",
  });
  if (insertError) {
    return NextResponse.json({ error: "加入课题组失败，请稍后重试。" }, { status: 500 });
  }

  return NextResponse.json({ groupId: targetGroupId });
}
