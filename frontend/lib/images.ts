import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  provider: string;
  size: string;
  createdAt: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function generateImage(
  prompt: string,
  size?: ImageSize,
  referenceImageUrl?: string
): Promise<GeneratedImage> {
  const res = await fetch(`${API_URL}/api/images`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ prompt, size, referenceImageUrl }),
  });
  const data = await handle(res);
  return data.image;
}

export async function uploadImageSource(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API_URL}/api/images/upload-source`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await handle(res);
  return data.url;
}

export async function listImages(): Promise<GeneratedImage[]> {
  const res = await fetch(`${API_URL}/api/images`, { headers: authHeaders() });
  const data = await handle(res);
  return data.images;
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/images/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete image");
}

/** Resolves a possibly-relative backend upload path into an absolute URL. */
export function absoluteImageUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}
