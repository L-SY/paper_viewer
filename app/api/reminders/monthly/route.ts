import { NextResponse } from "next/server";
import { monthlyReminderEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMonthContext, shortTime } from "@/lib/monthly-time";
import { getRequestOrigin } from "@/lib/http/request-origin";

type Member = { group_id: string; user_id: string };
type Group = { id: string; name: string; timezone: string; plan_deadline_day: number; plan_deadline_time: string; paper_deadline_rule: string; paper_deadline_day: number | null; paper_deadline_time: string };
type RecordRow = { group_id: string; student_id: string; plan_text: string | null; official_version_id: string | null };
type Profile = { id: string; display_name: string };

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase admin is not configured" }, { status: 503 });

  const now = new Date();
  const { data: groupData } = await admin.from("groups").select("id, name, timezone, plan_deadline_day, plan_deadline_time, paper_deadline_rule, paper_deadline_day, paper_deadline_time");
  const groupRows = (groupData || []) as Group[];
  const monthKeys = [...new Set(groupRows.map((group) => getMonthContext(group.timezone, now).monthKey))];
  const [{ data: memberData }, { data: recordData }, { data: profileData }, usersResult] = await Promise.all([
    admin.from("group_members").select("group_id, user_id").eq("role", "student").eq("status", "active"),
    monthKeys.length ? admin.from("monthly_records").select("group_id, student_id, research_month, plan_text, official_version_id").in("research_month", monthKeys) : Promise.resolve({ data: [] }),
    admin.from("profiles").select("id, display_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const members = (memberData || []) as Member[];
  const groups = new Map(groupRows.map((group) => [group.id, group]));
  const records = new Map(((recordData || []) as (RecordRow & { research_month: string })[]).map((record) => [`${record.group_id}:${record.student_id}:${record.research_month}`, record]));
  const profiles = new Map(((profileData || []) as Profile[]).map((profile) => [profile.id, profile.display_name]));
  const emails = new Map(usersResult.data.users.map((user) => [user.id, user.email || ""]));
  const appUrl = getRequestOrigin(request);
  const deliveries: Array<{ userId: string; kind: "plan" | "paper"; sent: boolean }> = [];

  for (const member of members) {
    const group = groups.get(member.group_id);
    const email = emails.get(member.user_id);
    if (!group || !email) continue;
    const localMonth = getMonthContext(group.timezone, now);
    const record = records.get(`${member.group_id}:${member.user_id}:${localMonth.monthKey}`);
    const kinds: Array<"plan" | "paper"> = [];
    if (localMonth.day >= Math.max(1, group.plan_deadline_day - 2) && localMonth.day <= group.plan_deadline_day && !record?.plan_text) kinds.push("plan");
    const paperDeadline = group.paper_deadline_rule === "fixed_day" && group.paper_deadline_day ? group.paper_deadline_day : localMonth.lastDay;
    if (localMonth.day >= Math.max(1, paperDeadline - 2) && localMonth.day <= paperDeadline && !record?.official_version_id) kinds.push("paper");

    for (const kind of kinds) {
      const deliveryKind = kind === "plan" ? "plan_reminder" : "paper_reminder";
      const idempotencyKey = `${deliveryKind}:${member.group_id}:${member.user_id}:${localMonth.monthKey}`;
      const { error: reservationError } = await admin.from("email_deliveries").insert({ group_id: member.group_id, recipient: email, kind: deliveryKind, idempotency_key: idempotencyKey, status: "pending" });
      if (reservationError) continue;
      const deadlineDay = kind === "plan" ? group.plan_deadline_day : paperDeadline;
      const deadlineTime = shortTime(kind === "plan" ? group.plan_deadline_time : group.paper_deadline_time);
      const content = monthlyReminderEmail({ groupName: group.name, displayName: profiles.get(member.user_id) || email.split("@")[0], kind, deadline: `${localMonth.monthKey.slice(0, 7)}-${String(deadlineDay).padStart(2, "0")} ${deadlineTime}`, appUrl: `${appUrl}/student` });
      const result = await sendTransactionalEmail({ to: email, ...content, idempotencyKey });
      await admin.from("email_deliveries").update({ status: result.sent ? "sent" : "failed", provider_message_id: result.sent ? result.id : null, error_message: result.sent ? null : result.error || result.reason }).eq("idempotency_key", idempotencyKey);
      deliveries.push({ userId: member.user_id, kind, sent: result.sent });
    }
  }
  return NextResponse.json({ checked: members.length, deliveries });
}
