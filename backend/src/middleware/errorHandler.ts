import { NextFunction, Request, Response } from "express";
import { logError } from "../services/errorLog.service";
import { AuthedRequest } from "./auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof ApiError ? err.message : "Internal server error";

  // Only real server errors (5xx) go into the admin Error Logs view — 4xx from ApiError is
  // normal request validation/not-found noise (wrong password, missing field, etc.), not a
  // bug worth surfacing to admins. Fire-and-forget: logging must never slow down or risk
  // the actual error response being sent to the client.
  if (status >= 500) {
    const stack = err instanceof Error ? err.stack : undefined;
    const rawMessage = err instanceof Error ? err.message : String(err);
    logError({
      message: rawMessage,
      stack,
      path: req.path,
      method: req.method,
      statusCode: status,
      userId: (req as AuthedRequest).user?.userId,
    }).catch(() => {
      // logError already swallows its own errors internally; this catch only guards
      // against the returned promise itself rejecting before entering that try/catch.
    });
    console.error("Unhandled error:", err);
  }

  return res.status(status).json({ error: message });
}
