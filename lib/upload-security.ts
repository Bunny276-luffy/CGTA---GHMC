import { randomBytes } from "crypto";

export interface FileSecurityCheckResult {
  ok: boolean;
  error?: string;
  safeFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  buffer?: Buffer;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Validates untrusted evidence uploads against payload size limits,
 * magic byte signatures, MIME types, and path traversal attempts.
 */
export function validateEvidenceUpload(
  dataUrlOrBuffer: string | Buffer,
  originalFileName?: string,
  maxSizeBytes = 10 * 1024 * 1024 // 10MB default
): FileSecurityCheckResult {
  let buffer: Buffer;
  let declaredMime = "image/jpeg";

  if (typeof dataUrlOrBuffer === "string") {
    if (!dataUrlOrBuffer.startsWith("data:")) {
      return { ok: false, error: "Invalid photo payload format." };
    }
    const parts = dataUrlOrBuffer.split(",");
    if (parts.length !== 2) {
      return { ok: false, error: "Malformed data URL payload." };
    }
    const headerMatch = parts[0].match(/data:(image\/[a-zA-Z0-9-+.]+);base64/);
    if (headerMatch) {
      declaredMime = headerMatch[1].toLowerCase();
    }
    buffer = Buffer.from(parts[1], "base64");
  } else if (Buffer.isBuffer(dataUrlOrBuffer)) {
    buffer = dataUrlOrBuffer;
  } else {
    return { ok: false, error: "Unsupported payload input type." };
  }

  if (buffer.length === 0) {
    return { ok: false, error: "Uploaded file is empty (0 bytes)." };
  }

  if (buffer.length > maxSizeBytes) {
    return {
      ok: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB.`,
    };
  }

  // Magic Bytes Check (File Signature Inspection)
  let detectedMime: string | null = null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = "image/jpeg";
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedMime = "image/png";
  } else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detectedMime = "image/webp";
  }

  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return {
      ok: false,
      error: "Invalid file signature. Only authentic JPEG, PNG, and WebP images are accepted.",
    };
  }

  // Reject executable or HTML signatures hidden inside image buffers
  const headerPreview = buffer.slice(0, 1024).toString("utf8").toLowerCase();
  if (
    headerPreview.includes("<script") ||
    headerPreview.includes("<?php") ||
    headerPreview.includes("#!/bin/bash") ||
    headerPreview.includes("system(") ||
    headerPreview.includes("eval(")
  ) {
    return { ok: false, error: "File rejected due to embedded script or code content." };
  }

  // Generate safe server-side unique filename (never trust client filename)
  const ext = detectedMime === "image/png" ? "png" : detectedMime === "image/webp" ? "webp" : "jpg";
  const safeFileName = `evidence_${Date.now()}_${randomBytes(8).toString("hex")}.${ext}`;

  return {
    ok: true,
    safeFileName,
    mimeType: detectedMime,
    sizeBytes: buffer.length,
    buffer,
  };
}
