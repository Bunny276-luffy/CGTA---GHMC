import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { tooManyRequests } from "../../../../lib/api-auth";

/**
 * GET /api/i18n/[lang]
 *
 * Serves translation resources for languages enabled in the jurisdiction
 * deployment profile. Unknown or disabled languages fall back to English.
 * Adding a language = add a resource file + enable it in configuration.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const limit = rateLimit(`i18n:${getClientIp(req)}`, 120, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const { lang: rawLang } = await params;
  const lang = String(rawLang).toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);

  const translationsDir = path.join(process.cwd(), "config", "translations");
  const requested = path.join(translationsDir, `${lang}.json`);
  const fallback = path.join(translationsDir, "en.json");

  try {
    // Only serve files that exist inside the translations directory.
    const file = fs.existsSync(requested) ? requested : fallback;
    const dict = JSON.parse(fs.readFileSync(file, "utf-8"));
    return NextResponse.json(dict, {
      headers: { "Cache-Control": "public, max-age=3600" }
    });
  } catch (err: any) {
    console.error("I18N ERROR:", err.message);
    return NextResponse.json(
      { message: "Translation resource unavailable." },
      { status: 503 }
    );
  }
}
