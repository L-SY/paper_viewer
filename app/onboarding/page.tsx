import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "完善资料" };
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ invite?: string | string[] }> }) {
  const query = await searchParams;
  const invite = Array.isArray(query.invite) ? query.invite[0] : query.invite;
  let displayName = "";
  let discipline = "";
  let researchStage = "exploring";
  let role: "student" | "teacher" = "student";
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("display_name, discipline, research_stage").eq("id", user.id).maybeSingle();
      displayName = data?.display_name || user.user_metadata.display_name || "";
      discipline = data?.discipline || "";
      researchStage = data?.research_stage || "exploring";
      role = user.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
    }
  }
  return <AuthShell eyebrow="个人资料" title="完善个人资料"><OnboardingForm initialInvite={invite || ""} initialDisplayName={displayName} initialDiscipline={discipline} initialResearchStage={researchStage} initialRole={role} /></AuthShell>;
}
