import { AppShell } from "./app-shell";
import type { AppRole } from "@/lib/auth/current-membership";

export function PlaceholderPage({ eyebrow, title, description, children, surface }: { eyebrow: string; title: string; description?: string; children: React.ReactNode; surface?: AppRole }) {
  return <AppShell surface={surface}><header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div></header><section className="content-section">{children}</section></AppShell>;
}
