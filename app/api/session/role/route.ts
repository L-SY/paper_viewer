import { NextResponse } from "next/server";
import { getCurrentMembership, type AppRole } from "@/lib/auth/current-membership";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { role?: AppRole } | null;
  const role = body?.role;
  if (role !== "student" && role !== "teacher") return NextResponse.json({ error: "身份无效。" }, { status: 400 });

  const session = await getCurrentMembership();
  if (!session.user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (!session.memberships.some((membership) => membership.role === role)) {
    return NextResponse.json({ error: "当前账号没有这个组内身份。" }, { status: 403 });
  }

  const destination = role === "teacher" ? "/teacher" : "/student";
  const response = NextResponse.json({ destination });
  response.cookies.set("paper_view_role", role, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
