"use client";

import { lazy, Suspense, useState } from "react";

const PdfReader = lazy(() =>
  import("./pdf-reader").then((module) => ({ default: module.PdfReader })),
);

export function OptionalPdfReader({
  url,
  filename,
  pageCount,
  sizeLabel,
}: {
  url: string;
  filename: string;
  pageCount: number;
  sizeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <section className="paper-panel optional-pdf-panel" aria-label="PDF 原文">
        <div className="optional-pdf-actions">
          <span>PDF 原文</span>
          <button className="text-link" type="button" onClick={() => setOpen(false)}>收起</button>
        </div>
        <Suspense fallback={<div className="pdf-loading">正在载入 PDF 阅读器…</div>}>
          <PdfReader url={url} filename={filename} pageCount={pageCount} sizeLabel={sizeLabel} />
        </Suspense>
      </section>
    );
  }

  return (
    <section className="optional-pdf-card" aria-label="PDF 原文">
      <div>
        <strong>{filename}</strong>
        <span>{pageCount} 页 · {sizeLabel}</span>
      </div>
      <div className="optional-pdf-actions">
        <button className="button button-secondary" type="button" onClick={() => setOpen(true)}>查看 PDF 原文</button>
        <a className="text-link" href={url} download={filename}>下载</a>
      </div>
    </section>
  );
}
