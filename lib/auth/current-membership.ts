import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type AppRole = "teacher" | "student";

type Membership = {
  group_id: string;
  role: AppRole;
  status: string;
  joined_at: string;
};

export async function getCurrentMembership() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { configured: false as const, supabase: null, user: null, profile: null, membership: null, memberships: [] as Membership[], group: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { configured: true as const, supabase, user: null, profile: null, membership: null, memberships: [] as Membership[], group: null };

  const [{ data: profile }, { data: membershipRows }] = await Promise.all([
    supabase.from("profiles").select("display_name, discipline, research_stage, onboarding_completed").eq("id", user.id).maybeSingle(),
    supabase.from("group_members").select("group_id, role, status, joined_at").eq("user_id", user.id).eq("status", "active").order("joined_at", { ascending: true }),
  ]);
  const memberships = (membershipRows || []) as Membership[];
  const cookieStore = await cookies();
  const selectedRole = cookieStore.get("paper_view_role")?.value;
  const preferredRole = user.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
  const membership = memberships.find((item) => item.role === selectedRole)
    || memberships.find((item) => item.role === preferredRole)
    || memberships[0]
    || null;
  const { data: group } = membership?.group_id
    ? await supabase.from("groups").select("id, name, timezone, plan_deadline_day, plan_deadline_time, paper_deadline_rule, paper_deadline_day, paper_deadline_time").eq("id", membership.group_id).maybeSingle()
    : { data: null };
  return { configured: true as const, supabase, user, profile, membership, memberships, group };
}
