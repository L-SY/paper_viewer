"use client";

import { useState } from "react";
import type { AppRole } from "@/lib/auth/current-membership";

export function RoleSwitcher({ currentRole, availableRoles }: { currentRole: AppRole; availableRoles: AppRole[] }) {
  const [loading, setLoading] = useState<AppRole | null>(null);
  const roles: { value: AppRole; label: string }[] = [{ value: "student", label: "学生端" }, { value: "teacher", label: "导师端" }];

  async function switchRole(role: AppRole) {
    if (role === currentRole || !availableRoles.includes(role)) return;
    setLoading(role);
    const response = await fetch("/api/session/role", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    if (!response.ok) {
      setLoading(null);
      return;
    }
    const result = await response.json() as { destination: string };
    window.location.replace(result.destination);
  }

  return (
    <div className="workspace-role-switch" aria-label="工作台身份切换">
      {roles.map((role) => {
        const available = availableRoles.includes(role.value);
        return <button key={role.value} className={currentRole === role.value ? "active" : ""} type="button" disabled={!available || loading !== null} title={available ? `切换到${role.label}` : `需要以${role.label.replace("端", "")}身份加入课题组`} onClick={() => switchRole(role.value)}>{loading === role.value ? "切换中…" : role.label}{!available && <span aria-hidden="true"> · 未开通</span>}</button>;
      })}
    </div>
  );
}
