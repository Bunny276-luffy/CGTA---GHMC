/**
 * Client-side image utilities — master report §39 Network Resilience:
 * "compressed images" before upload so the citizen workflow stays usable on
 * weak 4G / 3G connections.
 *
 * Note: canvas re-encoding strips EXIF. The citizen flow therefore verifies
 * evidence against the RAW image (EXIF GPS intact) and compresses only the
 * copy that is stored/submitted.
 */

export async function compressImage(
  dataUrl: string,
  maxSide = 1600,
  quality = 0.82
): Promise<string> {
  // Small images pass through untouched.
  if (dataUrl.length < 1_200_000) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      const scale = Math.min(1, maxSide / longest);
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Rough human-readable size of a data URL payload. */
export function dataUrlSizeKb(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4 / 1024);
}
