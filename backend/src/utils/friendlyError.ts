/**
 * Users must never see a raw provider error, a stack trace, or a raw API response — only
 * this generic message. The real error (provider name, status code, response body, whatever
 * it actually was) is always still logged server-side via console.error, exactly the same as
 * before; this only changes what goes in the HTTP response / SSE event the client receives.
 */
export const PROVIDER_ERROR_MESSAGE =
  "This AI provider is currently being updated. We're completing final optimizations. Please try again shortly.";

export const DOCUMENT_ERROR_MESSAGE =
  "We couldn't process this file. It may be corrupted, password-protected, or in an unsupported format. Please try a different file.";

/**
 * Wraps a caught upstream-provider error for safe display. `context` is just a short label
 * (e.g. "image.controller", "chat stream") to make the server console/log output easy to
 * trace back to a call site — it's never sent to the client.
 */
export function friendlyProviderError(err: unknown, context: string): string {
  console.error(`[${context}]`, err);
  return PROVIDER_ERROR_MESSAGE;
}

/** Same idea as friendlyProviderError, for document text-extraction failures specifically —
    those can be a genuine provider outage (image OCR goes through OpenAI/Google Vision) but
    are just as often a corrupt or unsupported file, so this uses accurate wording instead of
    always blaming "the AI provider". Real error still only ever goes to the console. */
export function friendlyDocumentError(err: unknown, context: string): string {
  console.error(`[${context}]`, err);
  return DOCUMENT_ERROR_MESSAGE;
}
