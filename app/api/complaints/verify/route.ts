import { NextResponse } from "next/server";
import { runVerificationPipeline, cacheVerificationResult } from "../../../../lib/verification-engine";
import { requireAuth, tooManyRequests } from "../../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import {
  cleanText,
  validateLatitude,
  validateLongitude,
  VALID_CATEGORIES,
  VALID_SEVERITIES,
} from "../../../../lib/validation";
import { validateEvidenceUpload } from "../../../../lib/upload-security";
import { logSystemError } from "../../../../lib/error-logger";

export async function POST(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER"]);
  if (!guard.ok) return guard.response;

  // The pipeline is CPU-heavy (OCR + object detection) — keep a tight budget.
  const limit = rateLimit(`verify:${getClientIp(req)}`, 20, 5 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const body = await req.json().catch(() => ({}) as any);

    // Validate category if provided
    let category: string | undefined = undefined;
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || !VALID_CATEGORIES.includes(body.category as any)) {
        return NextResponse.json(
          { message: "Invalid grievance category." },
          { status: 400 }
        );
      }
      category = body.category;
    }

    // Validate severity if provided
    let severity: string | undefined = undefined;
    if (body.severity !== undefined) {
      if (typeof body.severity !== "string" || !VALID_SEVERITIES.includes(body.severity as any)) {
        return NextResponse.json(
          { message: "Invalid grievance severity level." },
          { status: 400 }
        );
      }
      severity = body.severity;
    }

    // Validate user complaint coordinates if provided
    let userLat: number | undefined = undefined;
    let userLng: number | undefined = undefined;
    if (body.userLat !== undefined || body.userLng !== undefined) {
      if (!validateLatitude(body.userLat) || !validateLongitude(body.userLng)) {
        return NextResponse.json(
          { message: "Valid GPS coordinates are required." },
          { status: 400 }
        );
      }
      userLat = body.userLat;
      userLng = body.userLng;
    }

    // Validate device / EXIF coordinates if provided (do not substitute user coordinates)
    let deviceLat: number | undefined = undefined;
    let deviceLng: number | undefined = undefined;
    const rawDeviceLat = body.deviceLat !== undefined ? body.deviceLat : body.exifLat;
    const rawDeviceLng = body.deviceLng !== undefined ? body.deviceLng : body.exifLng;
    if (rawDeviceLat !== undefined || rawDeviceLng !== undefined) {
      if (!validateLatitude(rawDeviceLat) || !validateLongitude(rawDeviceLng)) {
        return NextResponse.json(
          { message: "Valid device GPS coordinates are required." },
          { status: 400 }
        );
      }
      deviceLat = rawDeviceLat;
      deviceLng = rawDeviceLng;
    }

    let fileBuffer: Buffer | undefined = undefined;
    let computedFileSize: number | undefined = typeof body.fileSize === "number" ? body.fileSize : undefined;
    let safeFileName = typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "evidence_photo.jpg";

    if (body.fileData && typeof body.fileData === "string") {
      const uploadCheck = validateEvidenceUpload(body.fileData, body.fileName);
      if (!uploadCheck.ok) {
        return NextResponse.json(
          { message: uploadCheck.error },
          { status: 400 }
        );
      }
      fileBuffer = uploadCheck.buffer;
      computedFileSize = uploadCheck.sizeBytes || fileBuffer?.length;
      safeFileName = uploadCheck.safeFileName || safeFileName;
    }

    const verificationResult = await runVerificationPipeline({
      fileName: safeFileName,
      fileSize: computedFileSize || (fileBuffer ? fileBuffer.length : 245000),
      fileType: "image/jpeg",
      category: category || "",
      description: typeof body.description === "string" ? cleanText(body.description, 2000) || "" : "",
      address: typeof body.address === "string" ? cleanText(body.address, 300) || undefined : undefined,
      userLat,
      userLng,
      deviceLat,
      deviceLng,
      fileLastModified: typeof body.fileLastModified === "number" ? body.fileLastModified : undefined,
      fileData: fileBuffer,
      severity
    });

    // Cache the verified result server-side to prevent redundant execution at submit time
    const token = cacheVerificationResult(verificationResult, {
      category: category || "",
      description: typeof body.description === "string" ? body.description : "",
      userLat,
      userLng
    });
    verificationResult.verificationToken = token;

    return NextResponse.json(verificationResult);
  } catch (err: any) {
    await logSystemError({
      area: "VERIFICATION",
      endpoint: "/api/complaints/verify",
      severity: "ERROR",
      message: `Verification processing failed: ${err.message}`,
    });
    return NextResponse.json(
      { message: "Verification processing failed. Please check the file and try again." },
      { status: 500 }
    );
  }
}
