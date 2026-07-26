"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VersionItem = {
  id: string;
  version_number: number;
  original_filename: string;
  size_bytes: number;
  page_count: number;
  submitted_at: string;
};

function firstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function bytesToMb(value: number) {
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function titleFromFilename(filename: string) {
  return filename.replace(/\.pdf$/i, "").replaceAll("_", " ").trim() || "Monthly paper";
}

export function MonthlySubmissionForm({
  initialVersions,
  demo,
}: {
  initialVersions: VersionItem[];
  demo: boolean;
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get("paper");
    const pdf = file instanceof File && file.size > 0 ? file : null;
    const supabase = createSupabaseBrowserClient();

    if (!supabase) return setMessage({ text: "当前是演示模式。" });
    if (!pdf) return setMessage({ text: "请选择一份 PDF。" });
    if (pdf.type !== "application/pdf") return setMessage({ text: "只能上传 PDF 文件。" });
    if (pdf.size > 30 * 1024 * 1024) return setMessage({ text: "PDF 不能超过 30 MB。" });

    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return setMessage({ text: "登录状态已过期，请重新登录。" });
    }
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("role", "student")
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) {
      setLoading(false);
      return setMessage({ text: "当前账号尚未以学生身份加入课题组。" });
    }

    let bytes: ArrayBuffer;
    let pageCount: number;
    let title = titleFromFilename(pdf.name);
    try {
      bytes = await pdf.arrayBuffer();
      const { PDFDocument } = await import("pdf-lib");
      const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
      pageCount = document.getPageCount();
      title = document.getTitle()?.trim() || title;
    } catch {
      setLoading(false);
      return setMessage({ text: "无法读取这份 PDF，请确认文件没有损坏或加密。" });
    }
    if (pageCount > 40) {
      setLoading(false);
      return setMessage({ text: `这份 PDF 有 ${pageCount} 页，超过 40 页上限。` });
    }

    const researchMonth = firstDayOfCurrentMonth();
    const { data: existing } = await supabase
      .from("monthly_records")
      .select("id")
      .eq("group_id", membership.group_id)
      .eq("student_id", user.id)
      .eq("research_month", researchMonth)
      .maybeSingle();
    let recordId = existing?.id as string | undefined;
    if (!recordId) {
      const { data: created, error } = await supabase
        .from("monthly_records")
        .insert({
          group_id: membership.group_id,
          student_id: user.id,
          research_month: researchMonth,
          plan_text: null,
          plan_submitted_at: null,
          status: "missing",
        })
        .select("id")
        .single();
      if (error || !created) {
        setLoading(false);
        return setMessage({ text: error?.message || "月度记录创建失败。" });
      }
      recordId = created.id;
    }

    const { data: latest } = await supabase
      .from("submission_versions")
      .select("version_number")
      .eq("monthly_record_id", recordId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versionNumber = (latest?.version_number || 0) + 1;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    const storagePath = `${membership.group_id}/${user.id}/${recordId}/v${versionNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("monthly-papers")
      .upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      setLoading(false);
      return setMessage({ text: uploadError.message });
    }

    const { data: version, error: versionError } = await supabase
      .from("submission_versions")
      .insert({
        monthly_record_id: recordId,
        version_number: versionNumber,
        title,
        storage_path: storagePath,
        original_filename: pdf.name,
        mime_type: "application/pdf",
        size_bytes: pdf.size,
        page_count: pageCount,
        sha256,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (versionError || !version) {
      await supabase.storage.from("monthly-papers").remove([storagePath]);
      setLoading(false);
      return setMessage({ text: versionError?.message || "版本记录写入失败。" });
    }

    const { error: recordError } = await supabase
      .from("monthly_records")
      .update({ official_version_id: version.id, status: "submitted" })
      .eq("id", recordId);
    if (recordError) {
      setLoading(false);
      return setMessage({ text: recordError.message });
    }

    setMessage({ text: "PDF 已上传，AI 正在生成中文概览和评阅。", success: true });
    const reviewResponse = await fetch("/api/ai-reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionVersionId: version.id, language: "zh" }),
    }).catch(() => null);
    const reviewResult = await reviewResponse?.json().catch(() => null) as { error?: string } | null;

    setLoading(false);
    const input = form.elements.namedItem("paper") as HTMLInputElement | null;
    if (input) input.value = "";
    setFileName(null);

    if (!reviewResponse?.ok) {
      setMessage({
        text: `PDF 已保存。AI 暂未完成：${reviewResult?.error || "可在论文页重试。"}`,
        success: true,
      });
      router.refresh();
      return;
    }

    router.push(`/papers/${version.id}?from=current`);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="form-layout submission-only-layout">
        <div>
          <section className="form-section">
            <div className="field-label"><span>论文 PDF</span><small>默认英文 · 30 MB · 40 页以内</small></div>
            <label className="upload-zone" htmlFor="paper-upload">
              <input id="paper-upload" name="paper" type="file" accept="application/pdf" onChange={(event) => setFileName(event.target.files?.[0]?.name || null)} />
              <span className="upload-icon">PDF</span>
              <strong>{fileName || "拖入文件或点击选择"}</strong>
            </label>
          </section>
          {message && <div className={`form-message submission-message${message.success ? " success" : ""}`} role="status">{message.text}</div>}
          <div className="submission-actions">
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? "处理中…" : "上传并开始分析"}
            </button>
            {demo && <span>当前为演示模式</span>}
          </div>
        </div>
        <aside>
          <section className="aside-card">
            <h3>历史版本</h3>
            <ol className="version-list">
              {initialVersions.length
                ? initialVersions.map((version) => (
                  <li key={version.id}>
                    <span>v{version.version_number}</span>
                    <div><strong>{version.original_filename}</strong><small>{bytesToMb(version.size_bytes)} · {version.page_count}页</small></div>
                    <Link className="text-link" href={`/papers/${version.id}?from=current`}>查看</Link>
                  </li>
                ))
                : <li><span>—</span><div><strong>暂无版本</strong></div></li>}
            </ol>
          </section>
        </aside>
      </div>
    </form>
  );
}
