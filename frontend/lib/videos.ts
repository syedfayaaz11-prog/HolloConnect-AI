import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type VideoStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";

export interface VideoGeneration {
  id: string;
  prompt: string;
  sourceImageUrl: string | null;
  sourceVideoUrl: string | null;
  status: VideoStatus;
  url: string | null;
  provider: string;
  error: string | null;
  createdAt: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function generateVideo(
  prompt: string,
  sourceImageUrl?: string,
  sourceVideoUrl?: string
): Promise<VideoGeneration> {
  const res = await fetch(`${API_URL}/api/videos`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, sourceImageUrl, sourceVideoUrl }),
  });
  const data = await handle(res);
  return data.video;
}

export async function listVideos(): Promise<VideoGeneration[]> {
  const res = await fetch(`${API_URL}/api/videos`, { headers: authHeaders() });
  const data = await handle(res);
  return data.videos;
}

export async function getVideo(id: string): Promise<VideoGeneration> {
  const res = await fetch(`${API_URL}/api/videos/${id}`, { headers: authHeaders() });
  const data = await handle(res);
  return data.video;
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/videos/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete video");
}

export async function uploadVideoSource(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API_URL}/api/videos/upload-source`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await handle(res);
  return data.url;
}

export async function uploadVideoSourceVideo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("video", file);
  const res = await fetch(`${API_URL}/api/videos/upload-video-source`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await handle(res);
  return data.url;
}

export function absoluteMediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}
