import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import crypto from "crypto";

interface AssetSpec {
  relativePath: string;
  url: string;
  expectedSize: number;
  expectedSha256: string;
}

const REQUIRED_ASSETS: AssetSpec[] = [
  {
    relativePath: path.join("data", "models", "yolos-tiny", "config.json"),
    url: "https://huggingface.co/Xenova/yolos-tiny/raw/e2f9c7673f0fa61849efe2b56a0d7774779ebb9d/config.json",
    expectedSize: 4145,
    expectedSha256: "ce8640ba6bd97a7b36ccf2d0dba9a6ac233211e2dc0c5dc4c63d922e80338c08",
  },
  {
    relativePath: path.join("data", "models", "yolos-tiny", "preprocessor_config.json"),
    url: "https://huggingface.co/Xenova/yolos-tiny/raw/e2f9c7673f0fa61849efe2b56a0d7774779ebb9d/preprocessor_config.json",
    expectedSize: 457,
    expectedSha256: "b010730968cdbccf8767b61b0a8e903396d831fd97f3c44cc9f0c0437deb7b7f",
  },
  {
    relativePath: path.join("data", "models", "yolos-tiny", "onnx", "model_quantized.onnx"),
    url: "https://huggingface.co/Xenova/yolos-tiny/resolve/e2f9c7673f0fa61849efe2b56a0d7774779ebb9d/onnx/model_quantized.onnx",
    expectedSize: 9661148,
    expectedSha256: "82b5c1de8aaaffd763c67d67b09b742a1c53628acfee3077af3fa59233e86b6b",
  },
  {
    relativePath: path.join("data", "ocr", "eng.traineddata"),
    url: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/923915d4ced2a7235221788285785a29c4a42d4a/eng.traineddata",
    expectedSize: 4113088,
    expectedSha256: "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2",
  },
];

const APPROVED_HOSTS = new Set([
  "huggingface.co",
  "us.aws.cdn.hf.co",
  "cdn-lfs.hf.co",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
]);

function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err: any) {
    throw new Error(`Invalid URL '${rawUrl}': ${err.message}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol '${parsed.protocol}' for '${rawUrl}'. Only 'https:' is permitted.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`URL credentials (userinfo) are not permitted in '${rawUrl}'.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!APPROVED_HOSTS.has(hostname)) {
    throw new Error(`Host '${hostname}' is not in the approved hosts allowlist for '${rawUrl}'.`);
  }

  return parsed;
}

function verifyLocalFile(filePath: string, expectedSize: number, expectedSha256: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const stats = fs.statSync(filePath);
    if (stats.size !== expectedSize) return false;
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return hash === expectedSha256;
  } catch {
    return false;
  }
}

function downloadStream(
  url: string,
  tempPath: string,
  socketTimeoutMs = 30000,
  wallClockDeadlineMs = 60000,
  maxRedirects = 5,
  visitedUrls = new Set<string>(),
  deadlineAt?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finalDeadlineAt = deadlineAt ?? (Date.now() + wallClockDeadlineMs);
    const remainingTime = finalDeadlineAt - Date.now();
    if (remainingTime <= 0) {
      return reject(
        new Error(`Download exceeded total wall-clock deadline of ${wallClockDeadlineMs}ms for ${url}`)
      );
    }

    let validatedUrl: URL;
    try {
      validatedUrl = validateUrl(url);
    } catch (err) {
      return reject(err);
    }

    visitedUrls.add(validatedUrl.toString());

    let settled = false;
    let redirected = false;
    let ownsTempFile = false;
    let fileStream: fs.WriteStream | null = null;
    let currentReq: http.ClientRequest | null = null;
    let currentRes: http.IncomingMessage | null = null;

    const cleanup = () => {
      if (deadlineTimer) clearTimeout(deadlineTimer);
      if (fileStream && !fileStream.destroyed) {
        fileStream.destroy();
      }
      if (currentRes && !currentRes.destroyed) {
        currentRes.destroy();
      }
      if (currentReq && !currentReq.destroyed) {
        currentReq.destroy();
      }
      if (ownsTempFile && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      if (deadlineTimer) clearTimeout(deadlineTimer);
      resolve();
    };

    const deadlineTimer = setTimeout(() => {
      fail(
        new Error(`Download exceeded total wall-clock deadline of ${wallClockDeadlineMs}ms for ${url}`)
      );
    }, remainingTime);

    currentReq = https.get(
      validatedUrl.toString(),
      {
        headers: {
          "User-Agent": "CivicTrust-Asset-Provisioner/1.0",
        },
      },
      (res) => {
        currentRes = res;

        // Redirect handling (3xx)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          res.resume();
          if (!res.headers.location) {
            return fail(new Error(`HTTP ${res.statusCode} redirect without Location header from ${url}`));
          }
          if (maxRedirects <= 0) {
            return fail(new Error(`Too many redirects fetching ${url} (exceeded maximum redirect limit)`));
          }

          let nextUrl: string;
          try {
            nextUrl = new URL(res.headers.location, validatedUrl).toString();
          } catch (err: any) {
            return fail(new Error(`Invalid redirect Location header from ${url}: ${err.message}`));
          }

          if (visitedUrls.has(nextUrl)) {
            return fail(new Error(`Redirect loop detected: '${nextUrl}' has already been visited`));
          }

          // Safe redirect handoff: mark redirected and disarm parent timeouts so old connection cannot race with child
          clearTimeout(deadlineTimer);
          redirected = true;
          ownsTempFile = false;
          currentReq?.setTimeout(0);

          return downloadStream(
            nextUrl,
            tempPath,
            socketTimeoutMs,
            wallClockDeadlineMs,
            maxRedirects - 1,
            visitedUrls,
            finalDeadlineAt
          )
            .then(succeed)
            .catch((err) => {
              if (settled) return;
              settled = true;
              reject(err);
            });
        }

        // Non-success status code
        if (res.statusCode !== 200) {
          res.resume();
          return fail(new Error(`HTTP ${res.statusCode} ${res.statusMessage} from ${url}`));
        }

        // Success 200 -> stream to temporary file
        ownsTempFile = true;
        fileStream = fs.createWriteStream(tempPath);
        res.pipe(fileStream);

        res.on("error", (err) => {
          fail(err);
        });

        fileStream.on("finish", () => {
          if (fileStream) {
            fileStream.close(() => {
              succeed();
            });
          } else {
            succeed();
          }
        });

        fileStream.on("error", (err) => {
          fail(err);
        });
      }
    );

    // Socket inactivity timeout
    currentReq.setTimeout(socketTimeoutMs, () => {
      if (redirected) return;
      fail(new Error(`Download socket timed out after ${socketTimeoutMs}ms of inactivity for ${url}`));
    });

    currentReq.on("error", (err) => {
      if (redirected) return;
      fail(err);
    });
  });
}

async function provisionAsset(asset: AssetSpec, maxRetries = 2): Promise<void> {
  const targetPath = path.join(process.cwd(), asset.relativePath);
  const targetDir = path.dirname(targetPath);

  // 1. Check if the destination file already exists and satisfies integrity
  if (verifyLocalFile(targetPath, asset.expectedSize, asset.expectedSha256)) {
    console.log(`[ASSET_VERIFIED] ${asset.relativePath} (${asset.expectedSize} bytes, SHA-256 matches)`);
    return;
  }

  // 2. Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 3. Download to a randomized temporary file
  const randSuffix = crypto.randomBytes(6).toString("hex");
  const tempPath = `${targetPath}.tmp.${randSuffix}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`[DOWNLOADING] ${asset.relativePath} (attempt ${attempt}/${maxRetries + 1})...`);
      await downloadStream(asset.url, tempPath);

      // 4. Verify downloaded byte count and SHA-256 before moving into place
      const stats = fs.statSync(tempPath);
      if (stats.size !== asset.expectedSize) {
        throw new Error(
          `Byte count mismatch for ${asset.relativePath}: got ${stats.size}, expected ${asset.expectedSize}`
        );
      }

      const tempContent = fs.readFileSync(tempPath);
      const computedHash = crypto.createHash("sha256").update(tempContent).digest("hex");
      if (computedHash !== asset.expectedSha256) {
        throw new Error(
          `SHA-256 integrity mismatch for ${asset.relativePath}: got ${computedHash}, expected ${asset.expectedSha256}`
        );
      }

      // 5. Atomic replacement
      fs.renameSync(tempPath, targetPath);
      console.log(`[PROVISIONED] ${asset.relativePath} successfully verified and placed.`);
      return;
    } catch (err: any) {
      lastError = err;
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      console.warn(`[RETRY_WARN] Attempt ${attempt} failed for ${asset.relativePath}: ${err.message}`);
    }
  }

  throw new Error(`Failed to provision asset ${asset.relativePath} after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

async function main() {
  console.log("=== CivicTrust Deterministic AI Asset Provisioning ===");
  const startTime = Date.now();

  try {
    for (const asset of REQUIRED_ASSETS) {
      await provisionAsset(asset);
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ All AI model and OCR assets verified in ${elapsed}s.`);
  } catch (err: any) {
    console.error(`❌ Asset provisioning failure: ${err.message}`);
    process.exit(1);
  }
}

main();
