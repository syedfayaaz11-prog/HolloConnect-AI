import { Router } from "express";
import path from "path";
import fs from "fs";
import { UPLOADS_DIR } from "../services/storage.service";
import { verifyUploadSignature } from "../utils/signedFileUrl";

const router = Router();

// Matches storage.service.ts's saveBuffer output shape: /uploads/<subdir>/<uuid>.<ext>.
// Deliberately strict (no `..`, no extra slashes, bounded extension length) so this is a
// second, independent layer of path-traversal protection on top of signedFileUrl's HMAC and
// storage.service.ts's own extension sanitization — defense in depth, not reliance on one
// single check.
const SAFE_UPLOAD_PATH = /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]{1,10}$/;

router.get(/^\/(.*)$/, (req, res) => {
  const relativePath = "/" + req.params[0];

  if (!SAFE_UPLOAD_PATH.test(relativePath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  const fullRequestPath = `/uploads${relativePath}`;
  if (!verifyUploadSignature(fullRequestPath, req.query.exp, req.query.sig)) {
    return res.status(403).json({ error: "Missing, invalid, or expired file link" });
  }

  const resolved = path.normalize(path.join(UPLOADS_DIR, relativePath));
  // Belt-and-suspenders: even with the regex above, confirm the resolved absolute path is
  // still actually inside UPLOADS_DIR before touching the filesystem.
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) return res.status(404).json({ error: "File not found" });

    // nosniff stops a browser from ignoring the declared Content-Type and rendering an
    // uploaded file as something more dangerous than it's supposed to be (e.g. treating a
    // .txt upload as HTML). Deliberately NOT forcing Content-Disposition: attachment here —
    // images/videos need to keep rendering inline in <img>/<video> tags across the app.
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.sendFile(resolved, (sendErr) => {
      if (sendErr && !res.headersSent) res.status(404).json({ error: "File not found" });
    });
  });
});

export default router;
