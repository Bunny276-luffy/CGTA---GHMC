import { NextResponse } from "next/server";
import { runVerificationPipeline, cacheVerificationResult } from "../../../../lib/verification-engine";
import { requireAuth, tooManyRequests } from "../../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { validatePhotoDataUrl } from "../../../../lib/validation";

export async function POST(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER"]);
  if (!guard.ok) return guard.response;

  // The pipeline is CPU-heavy (OCR + object detection) — keep a tight budget.
  const limit = rateLimit(`verify:${getClientIp(req)}`, 20, 5 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const body = await req.json().catch(() => ({}) as any);

    let fileBuffer: Buffer | undefined = undefined;
    if (body.fileData && typeof body.fileData === "string") {
      const photoCheck = validatePhotoDataUrl(body.fileData);
      if (!photoCheck.ok) {
        return NextResponse.json(
          { error: "Verification rejected", message: photoCheck.error },
          { status: 400 }
        );
      }
      const base64Data = body.fileData.split(",")[1];
      if (base64Data) {
        fileBuffer = Buffer.from(base64Data, "base64");
      }
    }

    const verificationResult = await runVerificationPipeline({
      fileName: typeof body.fileName === "string" ? body.fileName.slice(0, 200) : undefined,
      fileSize: typeof body.fileSize === "number" ? body.fileSize : undefined,
      fileType: typeof body.fileType === "string" ? body.fileType.slice(0, 100) : undefined,
      category: typeof body.category === "string" ? body.category.slice(0, 100) : undefined,
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : undefined,
      address: typeof body.address === "string" ? body.address.slice(0, 300) : undefined,
      userLat: typeof body.userLat === "number" ? body.userLat : undefined,
      userLng: typeof body.userLng === "number" ? body.userLng : undefined,
      deviceLat: typeof body.userLat === "number" ? body.userLat : undefined,
      deviceLng: typeof body.userLng === "number" ? body.userLng : undefined,
      fileLastModified: typeof body.fileLastModified === "number" ? body.fileLastModified : undefined,
      fileData: fileBuffer,
      severity: typeof body.severity === "string" ? body.severity.slice(0, 20) : undefined
    });

    // Cache the verified result server-side to prevent redundant execution at submit time
    const token = cacheVerificationResult(verificationResult, {
      category: typeof body.category === "string" ? body.category : "",
      description: typeof body.description === "string" ? body.description : ""
    });
    verificationResult.verificationToken = token;

    return NextResponse.json(verificationResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Verification failed", message: err.message },
      { status: 500 }
    );
  }
}
