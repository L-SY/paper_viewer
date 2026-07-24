import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PdfReader } from "@/components/pdf-reader";
import { getCurrentMembership } from "@/lib/auth/current-membership";
import { getMonthContext } from "@/lib/monthly-time";

export const metadata: Metadata = { title: "本月论文" };

export default async function MyPaperPage() {
  const session = await getCurrentMembership();
  const month = getMonthContext(session.group?.timezone || "Asia/Shanghai");
  let title = "本月论文";
  let filename = "";
  let pageCount = 0;
  let sizeLabel = "";
  let pdfUrl: string | null = null;
  let reviewId: string | null = null;

  if (session.configured && session.user && session.membership?.role === "student") {
    const { data: record } = await session.supabase
      .from("monthly_records")
      .select("official_version_id")
      .eq("group_id", session.membership.group_id)
      .eq("student_id", session.user.id)
      .eq("research_month", month.monthKey)
      .maybeSingle();

    if (record?.official_version_id) {
      reviewId = record.official_version_id;
      const { data: version } = await session.supabase
        .from("submission_versions")
        .select("title, storage_path, original_filename, size_bytes, page_count")
        .eq("id", record.official_version_id)
        .maybeSingle();

      if (version) {
        const { data: signed } = await session.supabase.storage
          .from("monthly-papers")
          .createSignedUrl(version.storage_path, 3600);
        title = version.title;
        filename = version.original_filename;
        pageCount = version.page_count;
        sizeLabel = `${(Number(version.size_bytes) / 1024 / 1024).toFixed(1)} MB`;
        pdfUrl = signed?.signedUrl || null;
      }
    }
  }

  return (
    <AppShell surface="student">
      <header className="page-header"><div><div className="eyebrow">{month.compactLabel}</div><h1>{title}</h1></div>{reviewId && <div className="header-actions"><Link className="button button-secondary" href={`/papers/${reviewId}`}>查看评阅</Link></div>}</header>
      {pdfUrl
        ? <section className="paper-panel standalone-reader" aria-label="本月论文 PDF"><PdfReader url={pdfUrl} filename={filename} pageCount={pageCount} sizeLabel={sizeLabel} /></section>
        : <section className="content-section"><p className="empty-copy">本月尚未提交 PDF。</p></section>}
    </AppShell>
  );
}
