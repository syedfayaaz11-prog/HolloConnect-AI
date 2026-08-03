/**
 * OCR: extracts text from images (photos of documents, screenshots, scanned pages saved
 * as images). Same swap-a-case pattern as every other provider in this codebase.
 *
 * Default: OpenAI's vision-capable chat model — no new API key needed since OPENAI_API_KEY
 * is already required for chat/images/voice. Set OCR_PROVIDER=google-vision to use Google
 * Cloud Vision instead (generally cheaper at high volume, purpose-built for OCR).
 */

export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const provider = process.env.OCR_PROVIDER ?? "openai-vision";
  if (provider === "google-vision") {
    return extractWithGoogleVision(buffer);
  }
  return extractWithOpenAIVision(buffer, mimeType);
}

async function extractWithOpenAIVision(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OCR is not configured. Set OPENAI_API_KEY in backend/.env.");
  }

  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract all readable text from this image, verbatim, preserving line breaks " +
                "and structure where reasonable. Return ONLY the extracted text — no commentary, " +
                "no markdown fences. If there is no readable text, return an empty string.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OCR request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function extractWithGoogleVision(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("Google Vision OCR is not configured. Set GOOGLE_VISION_API_KEY in backend/.env.");
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Vision request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.responses?.[0]?.fullTextAnnotation?.text ?? "";
}
