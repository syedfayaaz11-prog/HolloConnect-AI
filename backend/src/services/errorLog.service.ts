import { prisma } from "../config/db";

interface LogErrorInput {
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
}

/**
 * Records a server error for the admin panel's Error Logs view. Called from
 * middleware/errorHandler.ts — kept in its own file (not admin.service.ts) since it's a
 * cross-cutting concern the global error handler needs regardless of the Admin Panel
 * module, not admin-specific business logic.
 *
 * Fire-and-forget by convention at the call site (never awaited from errorHandler, so a
 * DB hiccup while logging an error can't turn one failed request into two). Errors from
 * this function itself are swallowed to a console.error rather than thrown, for the same
 * reason — logging infrastructure must never be able to crash the thing it's logging.
 */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        message: input.message.slice(0, 2000),
        stack: input.stack?.slice(0, 8000),
        path: input.path,
        method: input.method,
        statusCode: input.statusCode,
        userId: input.userId,
      },
    });
  } catch (err) {
    console.error("Failed to write error log:", err);
  }
}

export async function listErrorLogs(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [logs, total] = await Promise.all([
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.errorLog.count(),
  ]);
  return { logs, total, page, pageSize };
}
