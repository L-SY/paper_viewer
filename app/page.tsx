import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth/current-membership";

export default async function Home() {
  const session = await getCurrentMembership();
  if (!session.configured) redirect("/teacher");
  if (!session.user) redirect("/login");
  if (session.membership?.role === "student") redirect("/student");
  if (session.membership?.role === "teacher") redirect("/teacher");
  redirect("/group?setup=1");
}
