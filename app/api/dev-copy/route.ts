import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const srcDir = "C:\\Users\\Yashasvi\\.gemini\\antigravity-ide\\]brain\\679290cc-ae87-40d8-8f37-b8ddfe51a979";
    // Wait, let's fix path escaping:
    const baseSrcDir = "C:\\Users\\Yashasvi\\.gemini\\antigravity-ide\\brain\\679290cc-ae87-40d8-8f37-b8ddfe51a979";
    const destDir = "f:\\projects\\CGTA---GHMC-main\\public";

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const filesToCopy = [
      { src: "smart_city_ai_dashboard_1784459749861.png", dest: "smart_city_ai_dashboard.png" },
      { src: "pothole_ai_verification_1784459783361.png", dest: "pothole_ai_verification.png" },
      { src: "municipal_control_room_1784459798174.png", dest: "municipal_control_room.png" },
      { src: "secure_ledger_cryptography_1784459812741.png", dest: "secure_ledger_cryptography.png" },
      { src: "city_telemetry_audit_map_1784461445166.png", dest: "city_telemetry_audit_map.png" }
    ];

    const copiedFiles: string[] = [];

    for (const item of filesToCopy) {
      const srcPath = path.join(baseSrcDir, item.src);
      const destPath = path.join(destDir, item.dest);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedFiles.push(item.dest);
      }
    }

    return NextResponse.json({
      message: "Development copy complete",
      copied: copiedFiles
    });
  } catch (err: any) {
    console.error("DEV COPY ROUTE ERROR:", err.message);
    return NextResponse.json(
      { message: "Copy failed", error: err.message },
      { status: 500 }
    );
  }
}
