import { NextResponse } from "next/server";
import { getRepository } from "../../../../lib/db";
import { runVerificationPipeline, getCachedVerificationResult } from "../../../../lib/verification-engine";
import { getDepartmentForCategory, evaluateSla } from "../../../../lib/config";
import { requireAuth, tooManyRequests } from "../../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import {
  cleanText,
  validateLatitude,
  validateLongitude,
  VALID_CATEGORIES,
  VALID_SEVERITIES
} from "../../../../lib/validation";
import { validateEvidenceUpload } from "../../../../lib/upload-security";
import { verifyCaptchaToken } from "../../../../lib/captcha";
import { logSystemError } from "../../../../lib/error-logger";

export async function POST(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN"]);
  if (!guard.ok) return guard.response;
  const session = guard.session;
  const ip = getClientIp(req);

  const limit = rateLimit(`submit:${ip}`, 12, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const body = await req.json().catch(() => ({}) as any);
    const createdById = session.id;

    // CAPTCHA check
    const captchaResult = await verifyCaptchaToken(body.captchaToken, ip);
    if (!captchaResult.ok) {
      await logSystemError({
        area: "AUTH",
        endpoint: "/api/complaints/submit",
        severity: "WARNING",
        message: `CAPTCHA validation failed during grievance submit from IP ${ip}`,
      });
      return NextResponse.json({ message: captchaResult.message || "CAPTCHA verification failed" }, { status: 400 });
    }

    const title = cleanText(body.title, 200);
    const description = cleanText(body.description, 2000);
    const address = cleanText(body.address, 300);
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : null;
    const severity = VALID_SEVERITIES.includes(body.severity) ? body.severity : "STANDARD";
    const anonymous = Boolean(body.anonymous);

    if (!title || !description) {
      return NextResponse.json(
        { message: "A clean headline and description are required." },
        { status: 400 }
      );
    }
    if (!category) {
      return NextResponse.json({ message: "Invalid grievance category." }, { status: 400 });
    }
    if (!validateLatitude(body.latitude) || !validateLongitude(body.longitude)) {
      return NextResponse.json(
        { message: "Valid GPS coordinates are required." },
        { status: 400 }
      );
    }

    const latitude = body.latitude as number;
    const longitude = body.longitude as number;

    const photoDataUrl = typeof body.beforePhotoUrl === "string" && body.beforePhotoUrl ? body.beforePhotoUrl : null;
    let fileBuffer: Buffer | undefined = undefined;
    let computedFileSize = 245000;
    let safeFileName = "evidence_photo.jpg";

    if (photoDataUrl) {
      const uploadCheck = validateEvidenceUpload(photoDataUrl, body.photoName);
      if (!uploadCheck.ok) {
        await logSystemError({
          area: "UPLOAD",
          endpoint: "/api/complaints/submit",
          severity: "WARNING",
          message: `Evidence file upload security check rejected file: ${uploadCheck.error}`,
        });
        return NextResponse.json({ message: uploadCheck.error }, { status: 400 });
      }
      fileBuffer = uploadCheck.buffer;
      computedFileSize = uploadCheck.sizeBytes || 245000;
      safeFileName = uploadCheck.safeFileName || safeFileName;
    }

    // Safe server-side reuse of previously verified result (eliminates double pipeline execution)
    let verificationResult =
      (body.verificationToken ? getCachedVerificationResult(body.verificationToken) : null) ||
      (body.sha256Hash ? getCachedVerificationResult(body.sha256Hash) : null);

    if (!verificationResult) {
      verificationResult = await runVerificationPipeline({
        fileName: safeFileName,
        fileSize: computedFileSize,
        fileType: "image/jpeg",
        category,
        description,
        address: address || undefined,
        userLat: latitude,
        userLng: longitude,
        deviceLat: typeof body.exifLat === "number" ? body.exifLat : latitude,
        deviceLng: typeof body.exifLng === "number" ? body.exifLng : longitude,
        fileLastModified: Date.now(),
        fileData: fileBuffer,
        severity
      });
    }

    const trustScore = verificationResult.trustScore;
    const priorityPredicted = verificationResult.xaiReport.suggestedPriority || severity || "STANDARD";
    const explainableReport = verificationResult.xaiReport.summary;

    const routedDepartment = getDepartmentForCategory(category);
    const sla = evaluateSla(new Date(), severity);

    const duplicateDetected = verificationResult.isDuplicate;
    const duplicateParentId = verificationResult.duplicateLinkedId;
    const forgeryScore = verificationResult.manipulationDetected ? 85.0 : 0.0;

    let complaintId = "";
    let realTrackingId = "";
    try {
      const repo = getRepository();

      const newComplaint = await repo.createComplaint(
        {
          title,
          description,
          category,
          latitude,
          longitude,
          address: address || "Geocoded address",
          severity: priorityPredicted,
          anonymous,
          before_photo_url: photoDataUrl ?? undefined,
          created_by_id: createdById,
          status: trustScore >= 60.0 ? "SUBMITTED" : "TPA_REVIEW"
        }
      );

      complaintId = newComplaint.id;
      realTrackingId = newComplaint.tracking_id;

      await repo.createAIReport({
        complaint_id: complaintId,
        exif_data: { exifLat: body.exifLat, exifLng: body.exifLng, exifSoftware: cleanText(body.exifSoftware, 200) },
        duplicate_detected: duplicateDetected,
        duplicate_parent_id: duplicateParentId,
        forgery_score: forgeryScore,
        trust_score: trustScore,
        explainable_report: explainableReport,
        priority_predicted: priorityPredicted,
        image_sha256: verificationResult.sha256Hash || null,
        image_phash: verificationResult.image_phash || null
      });

      await repo.createAuditLog({
        user_id: createdById,
        action: "SUBMIT_COMPLAINT",
        details: `Filed grievance ${realTrackingId} with Trust Score: ${trustScore}%` +
          (routedDepartment ? ` — routed to ${routedDepartment.name}` : "")
      });
    } catch (dbError: any) {
      await logSystemError({
        area: "DATABASE",
        endpoint: "/api/complaints/submit",
        severity: "CRITICAL",
        message: `Database failure saving complaint for user ${createdById}`,
        details: dbError.message,
      });
      return NextResponse.json(
        { message: "Database persistence failed" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      message: "Grievance submitted successfully",
      complaint: {
        id: complaintId,
        trackingId: realTrackingId,
        title,
        status: trustScore >= 60.0 ? "SUBMITTED" : "TPA_REVIEW",
        trustScore,
        suggestedDepartment: routedDepartment ? routedDepartment.name : null,
        sla,
        verificationResult,
        explainableReport
      }
    });

  } catch (error: any) {
    await logSystemError({
      area: "SYSTEM",
      endpoint: "/api/complaints/submit",
      severity: "ERROR",
      message: `Unhandled exception during complaint submission: ${error.message}`,
    });
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
