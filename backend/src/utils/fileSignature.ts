/**
 * Checks the first few bytes of a buffer against known file signatures. Returns true if the
 * buffer's actual content is consistent with at least one of the expected mimetypes — used
 * as a second check after multer's fileFilter (which only trusts the client-supplied
 * Content-Type header) to catch a file that's been renamed/relabeled to look like something
 * it isn't.
 *
 * Plain-text formats (txt, csv) have no reliable magic bytes, so callers should skip this
 * check for those and rely on mimetype + extension allowlisting alone — that's the
 * "practical" boundary called out in the audit.
 */
export function matchesFileSignature(buffer: Buffer, expectedMimeTypes: string[]): boolean {
  if (buffer.length < 4) return false;

  const checks: { mimes: string[]; test: () => boolean }[] = [
    { mimes: ["image/png"], test: () => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { mimes: ["image/jpeg"], test: () => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
    { mimes: ["image/gif"], test: () => buffer.subarray(0, 3).toString("ascii") === "GIF" },
    {
      mimes: ["image/webp"],
      test: () => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
    },
    { mimes: ["image/bmp"], test: () => buffer.subarray(0, 2).toString("ascii") === "BM" },
    { mimes: ["application/pdf"], test: () => buffer.subarray(0, 4).toString("ascii") === "%PDF" },
    // DOCX/PPTX/XLSX are all ZIP containers — signature alone can't distinguish which,
    // that's what the (already-checked) mimetype/extension is for.
    {
      mimes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      test: () => buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    },
    // Legacy .xls (OLE Compound File) — kept separate from the ZIP-based formats above.
    {
      mimes: ["application/vnd.ms-excel"],
      test: () => buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    },
    // Common audio containers for voice transcription uploads.
    { mimes: ["audio/webm", "video/webm"], test: () => buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
    { mimes: ["audio/ogg"], test: () => buffer.subarray(0, 4).toString("ascii") === "OggS" },
    {
      mimes: ["audio/wav", "audio/wave", "audio/x-wav"],
      test: () => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE",
    },
    {
      mimes: ["audio/mpeg", "audio/mp3"],
      test: () =>
        buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
    },
    // MP4/MOV/M4A are all ISO base media file format containers, distinguished by the same
    // "ftyp" box at byte offset 4 — mimetype/extension (already checked) is what tells them
    // apart, same reasoning as the Office ZIP-container formats above.
    { mimes: ["audio/mp4", "audio/x-m4a", "audio/m4a", "video/mp4", "video/quicktime"], test: () => buffer.subarray(4, 8).toString("ascii") === "ftyp" },
  ];

  const relevant = checks.filter((c) => c.mimes.some((m) => expectedMimeTypes.includes(m)));
  if (relevant.length === 0) return false;
  return relevant.some((c) => c.test());
}

/** Formats/mimetypes with no reliable magic-byte signature — callers skip the content check
    for these and rely on the mimetype + extension allowlist alone. */
export const SIGNATURE_LESS_MIME_TYPES = new Set(["text/plain", "text/csv"]);
