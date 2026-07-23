import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_PAGES = 40;
const MAX_EXTRACTED_CHARACTERS = 300_000;

export class PdfTextExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PdfTextExtractionError";
  }
}

function normalizePageText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfPages(input: ArrayBuffer | Uint8Array) {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (data.byteLength > MAX_PDF_BYTES) {
    throw new PdfTextExtractionError("PDF_TOO_LARGE", "PDF 超过 30 MB 上限。");
  }

  const loadingTask = getDocument({ data });

  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PAGES) {
      throw new PdfTextExtractionError("PDF_TOO_MANY_PAGES", "PDF 超过 40 页上限。");
    }

    const pages: Array<{ page: number; text: string }> = [];
    let totalCharacters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePageText(content.items
        .flatMap((item) => {
          if (!("str" in item)) return [];
          return [item.hasEOL ? `${item.str}\n` : `${item.str} `];
        })
        .join(""));

      totalCharacters += text.length;
      if (totalCharacters > MAX_EXTRACTED_CHARACTERS) {
        throw new PdfTextExtractionError(
          "PDF_TEXT_TOO_LONG",
          "PDF 提取文本过长，请缩短论文后再评阅。",
        );
      }
      pages.push({ page: pageNumber, text });
    }

    if (totalCharacters < 80) {
      throw new PdfTextExtractionError(
        "PDF_TEXT_UNREADABLE",
        "PDF 几乎没有可提取文字；扫描版论文需要先进行 OCR。",
      );
    }

    return {
      pages,
      pageCount: document.numPages,
      totalCharacters,
    };
  } catch (error) {
    if (error instanceof PdfTextExtractionError) throw error;
    throw new PdfTextExtractionError(
      "PDF_EXTRACTION_FAILED",
      "无法提取 PDF 文字，请确认文件没有损坏或加密。",
    );
  } finally {
    await loadingTask.destroy();
  }
}
