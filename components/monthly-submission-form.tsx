"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type VersionItem = { version_number: number; original_filename: string; size_bytes: number; page_count: number; submitted_at: string };

function firstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function bytesToMb(value: number) {
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function MonthlySubmissionForm({ initialPlan, initialTitle, initialVersions, demo }: { initialPlan: string; initialTitle: string; initialVersions: VersionItem[]; demo: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success?: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const plan = String(values.get("plan") ?? "").trim();
    const title = String(values.get("title") ?? "").trim();
    const file = values.get("paper");
    const pdf = file instanceof File && file.size > 0 ? file : null;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setMessage({ text: "当前是演示模式。配置 Supabase 后即可真正保存。" });
    if (!plan && !pdf) return setMessage({ text: "请至少填写本月计划或选择一份 PDF。" });
    if (pdf && (!title || pdf.type !== "application/pdf")) return setMessage({ text: !title ? "上传论文时需要填写标题。" : "只能上传 PDF 文件。" });
    if (pdf && pdf.size > 30 * 1024 * 1024) return setMessage({ text: "PDF 不能超过 30 MB。" });

    setLoading(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return setMessage({ text: "登录状态已过期，请重新登录。" }); }
    const { data: membership, error: membershipError } = await supabase.from("group_members").select("group_id, role").eq("user_id", user.id).eq("status", "active").eq("role", "student").limit(1).maybeSingle();
    if (membershipError || !membership) { setLoading(false); return setMessage({ text: "当前账号尚未以学生身份加入课题组。" }); }

    const researchMonth = firstDayOfCurrentMonth();
    const { data: existing } = await supabase.from("monthly_records").select("id, status").eq("group_id", membership.group_id).eq("student_id", user.id).eq("research_month", researchMonth).maybeSingle();
    let recordId = existing?.id as string | undefined;
    if (recordId) {
      const { error } = await supabase.from("monthly_records").update({ plan_text: plan || null, plan_submitted_at: plan ? new Date().toISOString() : null }).eq("id", recordId);
      if (error) { setLoading(false); return setMessage({ text: error.message }); }
    } else {
      const { data: created, error } = await supabase.from("monthly_records").insert({ group_id: membership.group_id, student_id: user.id, research_month: researchMonth, plan_text: plan || null, plan_submitted_at: plan ? new Date().toISOString() : null, status: "missing" }).select("id").single();
      if (error || !created) { setLoading(false); return setMessage({ text: error?.message || "月度记录创建失败。" }); }
      recordId = created.id;
    }

    if (pdf && recordId) {
      let pageCount: number;
      let bytes: ArrayBuffer;
      try {
        bytes = await pdf.arrayBuffer();
        const { PDFDocument } = await import("pdf-lib");
        const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
        pageCount = document.getPageCount();
      } catch {
        setLoading(false);
        return setMessage({ text: "无法读取这份 PDF，请确认文件没有损坏或加密。" });
      }
      if (pageCount > 40) { setLoading(false); return setMessage({ text: `这份 PDF 有 ${pageCount} 页，超过 40 页上限。` }); }

      const { data: latest } = await supabase.from("submission_versions").select("version_number").eq("monthly_record_id", recordId).order("version_number", { ascending: false }).limit(1).maybeSingle();
      const versionNumber = (latest?.version_number || 0) + 1;
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
      const storagePath = `${membership.group_id}/${user.id}/${recordId}/v${versionNumber}.pdf`;
      const { error: uploadError } = await supabase.storage.from("monthly-papers").upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });
      if (uploadError) { setLoading(false); return setMessage({ text: uploadError.message }); }

      const { data: version, error: versionError } = await supabase.from("submission_versions").insert({ monthly_record_id: recordId, version_number: versionNumber, title, storage_path: storagePath, original_filename: pdf.name, mime_type: "application/pdf", size_bytes: pdf.size, page_count: pageCount, sha256, created_by: user.id }).select("id").single();
      if (versionError || !version) {
        await supabase.storage.from("monthly-papers").remove([storagePath]);
        setLoading(false);
        return setMessage({ text: versionError?.message || "版本记录写入失败。" });
      }
      const { error: recordError } = await supabase.from("monthly_records").update({ official_version_id: version.id, status: "submitted" }).eq("id", recordId);
      if (recordError) { setLoading(false); return setMessage({ text: recordError.message }); }
    }

    setLoading(false);
    setMessage({ text: pdf ? "本月计划和新 PDF 版本已经保存。" : "本月计划已经保存。", success: true });
    const fileInput = form.elements.namedItem("paper") as HTMLInputElement | null;
    if (fileInput) fileInput.value = "";
    setFileName(null);
  }

  return (
    <form onSubmit={submit}>
      <div className="form-layout"><div><section className="form-section"><label className="field-label" htmlFor="paper-title">论文标题</label><input id="paper-title" className="text-input full-input" name="title" defaultValue={initialTitle} placeholder="与 PDF 中的标题一致" /></section><section className="form-section"><label className="field-label" htmlFor="plan">月初计划</label><textarea id="plan" className="text-area" name="plan" defaultValue={initialPlan} placeholder="本月目标" /></section><section className="form-section"><div className="field-label"><span>论文 PDF</span><small>30 MB · 40 页以内</small></div><label className="upload-zone" htmlFor="paper-upload"><input id="paper-upload" name="paper" type="file" accept="application/pdf" onChange={(event) => setFileName(event.target.files?.[0]?.name || null)} /><span className="upload-icon">PDF</span><strong>{fileName || "拖入文件或点击选择"}</strong></label></section>{message && <div className={`form-message submission-message${message.success ? " success" : ""}`} role="status">{message.text}</div>}<div className="submission-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? "保存中…" : "保存本月记录"}</button>{demo && <span>当前为演示模式</span>}</div></div><aside><section className="aside-card"><h3>历史版本</h3><ol className="version-list">{initialVersions.length ? initialVersions.map((version) => <li key={version.version_number}><span>v{version.version_number}</span><div><strong>{version.original_filename}</strong><small>{bytesToMb(version.size_bytes)} · {version.page_count}页</small></div></li>) : <li><span>—</span><div><strong>暂无版本</strong></div></li>}</ol></section></aside></div>
    </form>
  );
}
