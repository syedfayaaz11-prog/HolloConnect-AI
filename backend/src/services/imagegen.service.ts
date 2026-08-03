/**
 * Image generation provider abstraction. Same swap-a-case pattern as ai.service.ts
 * and websearch.service.ts. Default provider is OpenAI's image API; add Stability AI,
 * Replicate, etc. as additional cases when those modules' needs (editing, inpainting,
 * upscaling) require a provider OpenAI doesn't cover well.
 */

export interface GeneratedImageResult {
  buffer: Buffer;
  extension: string;
}

const VALID_SIZES = ["1024x1024", "1024x1792", "1792x1024"] as const;
export type ImageSize = (typeof VALID_SIZES)[number];

export async function generateImage(
  prompt: string,
  size: ImageSize = "1024x1024",
  referenceImage?: { buffer: Buffer; mimetype: string }
): Promise<GeneratedImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Image generation is not configured. Set OPENAI_API_KEY in backend/.env.");
  }

  // Reference image present -> image-to-image edit, via gpt-image-1's /images/edits endpoint
  // (multipart form). dall-e-3, used below for plain text-to-image, has no edit endpoint at
  // all — gpt-image-1 is the currently-supported model that does, so this path only switches
  // model for requests that actually need editing; the existing generations path is untouched.
  if (referenceImage) {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", size === "1024x1792" || size === "1792x1024" ? "auto" : size);
    form.append(
      "image",
      new Blob([referenceImage.buffer], { type: referenceImage.mimetype }),
      `reference.${referenceImage.mimetype.split("/")[1] || "png"}`
    );

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Image edit failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image edit returned no image data");
    return { buffer: Buffer.from(b64, "base64"), extension: "png" };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      size,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Image generation failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image generation returned no image data");

  return { buffer: Buffer.from(b64, "base64"), extension: "png" };
}
