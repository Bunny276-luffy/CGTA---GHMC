import { getRepository } from "./db";

export interface LogErrorParams {
  area: "AUTH" | "DATABASE" | "VERIFICATION" | "UPLOAD" | "OCR" | "YOLOS" | "API" | "SYSTEM";
  endpoint?: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  message: string;
  details?: string;
}

/**
  * Centralized system error logger for CivicTrust.
  * Sanitizes credentials/secrets before logging to console and database.
  */
export async function logSystemError(params: LogErrorParams): Promise<void> {
  const sanitize = (text: string) =>
    text.replace(/(password|secret|token|authorization|bearer|cookie|key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");

  const cleanMessage = sanitize(params.message);
  const cleanDetails = params.details ? sanitize(params.details) : undefined;

  console.error(`[CIVICTRUST_ERROR][${params.severity}][${params.area}] ${cleanMessage}`);

  try {
    const repo = getRepository();
    await repo.createSystemError({
      area: params.area,
      endpoint: params.endpoint || null,
      severity: params.severity,
      message: cleanMessage,
      details: cleanDetails || null
    });
  } catch (err: any) {
    console.error("Failed to write system error to database:", err.message);
  }
}
