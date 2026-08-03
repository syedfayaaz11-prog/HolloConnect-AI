"use client";

import { useEffect, useRef } from "react";
import { VideoGeneration, getVideo } from "@/lib/videos";

const POLL_INTERVAL_MS = 5000;

/**
 * Polls any PENDING/PROCESSING videos in the given list until they resolve, calling
 * onUpdate with each refreshed record. Stops polling a video once it's COMPLETE/FAILED.
 */
export function useVideoStatusPolling(
  videos: VideoGeneration[],
  onUpdate: (video: VideoGeneration) => void
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const pending = videos.filter((v) => v.status === "PENDING" || v.status === "PROCESSING");
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      for (const video of pending) {
        try {
          const updated = await getVideo(video.id);
          if (updated.status !== video.status) {
            onUpdateRef.current(updated);
          }
        } catch (err) {
          console.error("Video status poll failed:", err);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [videos]);
}
