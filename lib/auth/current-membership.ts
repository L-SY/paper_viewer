import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "teacher" | "student";

export async function getCurrentMembership() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { configured: false as const, supabase: null, user: null, profile: null, membership: null, group: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true as const, supabase, user: null, profile: null, membership: null, group: null };

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("display_name, discipline, research_stage").eq("id", user.id).maybeSingle(),
    supabase.from("group_members").select("group_id, role, status").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(),
  ]);
  const { data: group } = membership?.group_id
    ? await supabase.from("groups").select("id, name, timezone, plan_deadline_day, plan_deadline_time, paper_deadline_rule, paper_deadline_day, paper_deadline_time").eq("id", membership.group_id).maybeSingle()
    : { data: null };
  return { configured: true as const, supabase, user, profile, membership, group };
}
