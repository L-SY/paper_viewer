import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export default async function Home() {
  const session = await getCurrentMembership();
  if (!session.configured) redirect("/teacher");
  if (!session.user) redirect("/login");
  if (session.membership?.role === "student") redirect("/student");
  if (session.membership?.role === "teacher") redirect("/teacher");
  if (!session.profile?.onboarding_completed) redirect("/onboarding");
  const preferredRole = session.user.user_metadata.preferred_role === "teacher" ? "teacher" : "student";
  redirect(`/group?setup=${preferredRole}`);
}
