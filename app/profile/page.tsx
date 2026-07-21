import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ProfileForm, type ProfileValues } from "@/components/profile-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "个人资料" };

export default async function ProfilePage() {
  const values: ProfileValues = { displayName: "林老师", discipline: "机器人", researchStage: "research" };
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("display_name, discipline, research_stage").eq("id", user.id).maybeSingle();
      if (data) {
        values.displayName = data.display_name || values.displayName;
        values.discipline = data.discipline || "";
        values.researchStage = data.research_stage || "exploring";
      }
    }
  }
  return <AppShell><header className="page-header"><div><div className="eyebrow">ACCOUNT</div><h1>个人资料</h1><p>用于组内识别和档案展示。</p></div></header><section className="narrow-content"><ProfileForm values={values} /></section></AppShell>;
}
