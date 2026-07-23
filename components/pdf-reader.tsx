"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type ReaderStatus = "loading" | "ready" | "error";

export function PdfReader({
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
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);
  const [status, setStatus] = useState<ReaderStatus>("loading");
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(pageCount);
  const [zoom, setZoom] = useState(1);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateWidth = () => setStageWidth(stage.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void>; promise: Promise<PDFDocumentProxy> } | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ url });
        const document = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        documentRef.current = document;
        setTotalPages(document.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setError("PDF 暂时无法加载");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const document = documentRef.current;
      documentRef.current = null;
      void loadingTask?.destroy();
      void document?.cleanup();
    };
  }, [url]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || status !== "ready" || stageWidth < 200) return;
    let cancelled = false;

    void (async () => {
      try {
        renderTaskRef.current?.cancel();
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const naturalViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(stageWidth - 56, 280);
        const fitScale = Math.min(availableWidth / naturalViewport.width, 1.6);
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvas,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (renderError) {
        if (!cancelled && renderError instanceof Error && renderError.name !== "RenderingCancelledException") {
          setError("这一页暂时无法显示");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pageNumber, stageWidth, status, zoom]);

  const goToPage = (nextPage: number) => {
    setPageNumber(Math.min(Math.max(nextPage, 1), totalPages));
    stageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pdf-reader">
      <div className="panel-toolbar">
        <div><strong>{filename}</strong><span>{totalPages} 页 · {sizeLabel}</span></div>
        <a className="text-link" href={url} download={filename}>下载</a>
      </div>
      <div className="pdf-reader-controls">
        <div>
          <button className="icon-button" type="button" disabled={pageNumber <= 1 || status !== "ready"} onClick={() => goToPage(pageNumber - 1)}>上一页</button>
          <span>{pageNumber} / {totalPages}</span>
          <button className="icon-button" type="button" disabled={pageNumber >= totalPages || status !== "ready"} onClick={() => goToPage(pageNumber + 1)}>下一页</button>
        </div>
        <div>
          <button className="icon-button" type="button" aria-label="缩小" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="icon-button" type="button" aria-label="放大" disabled={zoom >= 1.75} onClick={() => setZoom((value) => Math.min(1.75, value + 0.25))}>＋</button>
        </div>
      </div>
      <div className="pdf-stage pdf-reader-stage" ref={stageRef}>
        {status === "loading" && <p className="pdf-reader-state">正在加载 PDF…</p>}
        {status === "error" && <div className="pdf-reader-state"><strong>{error}</strong><a className="text-link" href={url} target="_blank" rel="noreferrer">在新窗口打开</a></div>}
        <canvas ref={canvasRef} className={status === "ready" ? "" : "is-hidden"} aria-label={`第 ${pageNumber} 页`} />
      </div>
    </div>
  );
}
