import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { asyncHandler } from "../utils/asyncHandler";
import { wrapMulter, uploadImage } from "../middleware/upload";
import { createImage, deleteImage, getImage, listImages, uploadImageSource } from "../controllers/image.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listImages));
router.post("/", aiLimiter, asyncHandler(createImage));
router.get("/:id", asyncHandler(getImage));
router.delete("/:id", asyncHandler(deleteImage));
router.post("/upload-source", wrapMulter(uploadImage.single("image")), asyncHandler(uploadImageSource));

export default router;
