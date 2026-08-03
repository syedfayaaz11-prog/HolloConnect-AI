import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { wrapMulter, uploadImage, uploadVideo } from "../middleware/upload";
import {
  createVideo,
  deleteVideo,
  getVideo,
  listVideos,
  uploadVideoSource,
  uploadVideoSourceVideo,
} from "../controllers/video.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listVideos));
router.post("/", aiLimiter, asyncHandler(createVideo));
router.get("/:id", asyncHandler(getVideo));
router.delete("/:id", asyncHandler(deleteVideo));
router.post("/upload-source", wrapMulter(uploadImage.single("image")), asyncHandler(uploadVideoSource));
router.post("/upload-video-source", wrapMulter(uploadVideo.single("video")), asyncHandler(uploadVideoSourceVideo));

export default router;
