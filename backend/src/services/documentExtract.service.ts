/**
 * Text extraction for uploaded documents. Each format gets its own extractor function;
 * add a case + extractor here for any new format (image-based OCR is handled by the
 * separate OCR module, which can reuse this file's dispatch pattern).
 */

import AdmZip from "adm-zip";
import { extractTextFromImage } from "./ocr.service";

const MAX_EXTRACTED_CHARS = 200_000; // keep DB rows and downstream prompts reasonable

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp"]);

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  let text: string;

  if (mimeType === "application/pdf" || ext === "pdf") {
    text = await extractPdf(buffer);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    text = await extractDocx(buffer);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx"
  ) {
    text = extractPptx(buffer);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    text = extractXlsx(buffer);
  } else if (mimeType === "text/csv" || ext === "csv") {
    text = buffer.toString("utf-8");
  } else if (mimeType === "text/plain" || ext === "txt") {
    text = buffer.toString("utf-8");
  } else if (IMAGE_MIME_TYPES.has(mimeType) || IMAGE_EXTENSIONS.has(ext)) {
    // OCR: photos of documents, screenshots, scanned pages saved as image files.
    text = await extractTextFromImage(buffer, mimeType || `image/${ext}`);
  } else {
    throw new Error(
      `Unsupported document type: ${mimeType || ext}. Supported: PDF, DOCX, PPTX, XLSX, CSV, TXT, and images (PNG/JPEG/WEBP/GIF/BMP via OCR).`
    );
  }

  return text.slice(0, MAX_EXTRACTED_CHARS);
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Lazy-required because pdf-parse reads a test fixture at import time in some versions
  // when bundled eagerly; requiring inside the function avoids that entirely.
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);

  // A scanned PDF (photographed/scanned pages with no embedded text layer) yields
  // near-empty text here. True support requires rendering each page to an image (needs a
  // native dependency — Poppler/GraphicsMagick — not yet added to this project) and running
  // each page through ocr.service.ts. Rather than silently return nothing, fail clearly and
  // point to the real workaround: export/convert the scanned pages to image files and
  // upload those directly — the OCR path in this same file already handles images.
  if (data.text.trim().length < 20 && data.numpages > 0) {
    throw new Error(
      "This PDF appears to be scanned (no embedded text layer). Page-by-page PDF OCR isn't " +
        "supported yet — as a workaround, export/convert the pages to image files and " +
        "upload those instead; image OCR is fully supported."
    );
  }

  return data.text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractPptx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const slideEntries = zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/(\d+)/)?.[1] ?? "0", 10);
      const numB = parseInt(b.entryName.match(/(\d+)/)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const slideTexts = slideEntries.map((entry, i) => {
    const xml = entry.getData().toString("utf-8");
    // Pull text out of <a:t>...</a:t> runs — sufficient for readable extraction without a
    // full OOXML parser, which would be significant added complexity for marginal gain here.
    const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
    return `Slide ${i + 1}:\n${matches.join(" ")}`;
  });

  return slideTexts.join("\n\n");
}

function extractXlsx(buffer: Buffer): string {
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((name: string) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `Sheet: ${name}\n${csv}`;
  }).join("\n\n");
}
