-- Adds an optional source-video reference alongside the existing source-image reference on
-- VideoGeneration, for the new video-to-video upload path (Video AI's "+" button can now take
-- either an image or a video as a starting point). Nullable, additive-only — existing rows
-- are unaffected.
ALTER TABLE "video_generations" ADD COLUMN "sourceVideoUrl" TEXT;
