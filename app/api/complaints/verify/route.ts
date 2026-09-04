import { NextResponse } from "next/server";
import { runVerificationPipeline, cacheVerificationResult } from "@/lib/verification-engine";

export async function POST(req: Request) {
  try {
    const {
      fileName,
      fileSize,
      fileType,
      category,
      description,
      address,
      userLat,
      userLng,
      fileLastModified,
      fileData,
      severity
    } = await req.json();

    let fileBuffer: Buffer | undefined = undefined;
    if (fileData && fileData.startsWith("data:")) {
      const base64Data = fileData.split(",")[1];
      if (base64Data) {
        fileBuffer = Buffer.from(base64Data, "base64");
      }
    }

    const verificationResult = await runVerificationPipeline({
      fileName,
      fileSize,
      fileType,
      category,
      description,
      address,
      userLat: typeof userLat === "number" ? userLat : undefined,
      userLng: typeof userLng === "number" ? userLng : undefined,
      deviceLat: typeof userLat === "number" ? userLat : undefined,
      deviceLng: typeof userLng === "number" ? userLng : undefined,
      fileLastModified: typeof fileLastModified === "number" ? fileLastModified : undefined,
      fileData: fileBuffer,
      severity
    });

    // Cache the verified result server-side to prevent redundant execution at submit time
    const token = cacheVerificationResult(verificationResult, { category, description });
    verificationResult.verificationToken = token;

    return NextResponse.json(verificationResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Verification failed", message: err.message },
      { status: 500 }
    );
  }
}

