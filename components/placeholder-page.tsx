import { AppShell } from "./app-shell";

export function PlaceholderPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <AppShell><header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div></header><section className="content-section">{children}</section></AppShell>;
}
