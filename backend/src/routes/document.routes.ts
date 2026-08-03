import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { wrapMulter, uploadDocument as uploadDocumentMiddleware } from "../middleware/upload";
import {
  askDocument,
  compareDocuments,
  deleteDocument,
  getDocument,
  listDocuments,
  summarizeDocument,
  translateDocument,
  uploadDocument,
} from "../controllers/document.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listDocuments));
router.post("/", aiLimiter, wrapMulter(uploadDocumentMiddleware.single("file")), asyncHandler(uploadDocument));
router.post("/compare", aiLimiter, asyncHandler(compareDocuments));
router.get("/:id", asyncHandler(getDocument));
router.delete("/:id", asyncHandler(deleteDocument));
router.post("/:id/summarize", aiLimiter, asyncHandler(summarizeDocument));
router.post("/:id/ask", aiLimiter, asyncHandler(askDocument));
router.post("/:id/translate", aiLimiter, asyncHandler(translateDocument));

export default router;
