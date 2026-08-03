import PDFDocument from "pdfkit";
import { Response } from "express";

interface ReportForPdf {
  topic: string;
  sections: { heading: string; content: string }[];
  sources: { title: string; url: string }[];
  createdAt: Date;
}

/** Streams a formatted PDF of a research report directly to the response. */
export function streamResearchPdf(res: Response, report: ReportForPdf) {
  const doc = new PDFDocument({ margin: 56 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitizeFilename(report.topic)}.pdf"`
  );
  doc.pipe(res);

  doc.fontSize(20).fillColor("#111").text(report.topic, { align: "left" });
  doc
    .fontSize(9)
    .fillColor("#666")
    .text(`HolloConnect AI · Deep Research · ${report.createdAt.toLocaleDateString()}`);
  doc.moveDown(1.5);

  for (const section of report.sections) {
    doc.fontSize(14).fillColor("#111").text(section.heading, { underline: false });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#222").text(stripMarkdown(section.content), {
      align: "left",
      lineGap: 3,
    });
    doc.moveDown(1);
  }

  if (report.sources.length > 0) {
    doc.addPage();
    doc.fontSize(14).fillColor("#111").text("Sources");
    doc.moveDown(0.5);
    report.sources.forEach((s, i) => {
      doc.fontSize(10).fillColor("#222").text(`[${i + 1}] ${s.title}`);
      doc.fontSize(9).fillColor("#4a5fd6").text(s.url, { link: s.url, underline: true });
      doc.moveDown(0.5);
    });
  }

  doc.end();
}

function stripMarkdown(text: string): string {
  // Lightweight cleanup so citation-heavy markdown reads reasonably as plain PDF text.
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#+\s*/gm, "");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").slice(0, 60) || "research-report";
}
