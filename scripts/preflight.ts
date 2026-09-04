import fs from 'fs';
import path from 'path';

try {
  const envPaths = [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^#\s][^=]*)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  }
} catch (err) {
  // Ignore env loading errors
}

console.log("Running Preflight Checks for CivicTrust Application...");

let hasErrors = false;

// 1. Check environment variables
console.log("\nChecking Environment Variables...");
const provider = process.env.DATABASE_PROVIDER;
if (!provider) {
  console.log("❌ DATABASE_PROVIDER is missing. Defaulting to sqlite but it should be set explicitly.");
  hasErrors = true;
} else {
  console.log(`✅ DATABASE_PROVIDER is set to ${provider}`);
}

// 2. Database validation
console.log("\nChecking Database Connectivity...");
if (provider === 'sqlite') {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    console.log("❌ SQLite data directory 'data/' is missing.");
    hasErrors = true;
  } else {
    console.log(`✅ SQLite data directory 'data/' exists.`);
  }
} else if (provider === 'postgres') {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("❌ DATABASE_URL is missing for postgres provider.");
    hasErrors = true;
  } else {
    console.log(`✅ DATABASE_URL is set.`);
  }
}

// 3. Application State Check (Resilience & Config)
console.log("\nChecking Application States & Folders...");
const appDir = path.join(process.cwd(), 'app');
if (!fs.existsSync(appDir)) {
  console.log("❌ app/ directory is missing.");
  hasErrors = true;
} else {
  console.log(`✅ Next.js app/ directory exists.`);
}

// 4. Runtime / Node Check
console.log("\nChecking Runtime Environment...");
const nodeVersion = process.version;
console.log(`✅ Node version: ${nodeVersion}`);
if (!parseInt(nodeVersion.replace('v', '')) || parseInt(nodeVersion.replace('v', '')) < 18) {
  console.log("❌ Node version 18+ is recommended.");
}

// 5. Verification Engine & Local AI Models
console.log("\nChecking Local AI & Verification Engine Assets...");
const ocrDir = path.join(process.cwd(), 'data', 'ocr');
if (fs.existsSync(ocrDir)) {
  console.log("✅ OCR directory 'data/ocr' exists (Tesseract.js cache).");
} else {
  console.log("⚠️ OCR directory 'data/ocr' missing (Tesseract.js will download it on first run, which requires network).");
}

const modelsDir = path.join(process.cwd(), 'data', 'models');
if (fs.existsSync(modelsDir)) {
  console.log("✅ Models directory 'data/models' exists (ONNX local models).");
} else {
  console.log("⚠️ Models directory 'data/models' missing (Transformers.js will download on first run, requiring network).");
}

// 6. Security & Auth Check
console.log("\nChecking Security Configuration...");
if (!process.env.NEXTAUTH_SECRET) {
  console.log("❌ NEXTAUTH_SECRET is missing. Authentication will fail closed.");
  hasErrors = true;
} else {
  console.log("✅ NEXTAUTH_SECRET is configured.");
}

console.log("\n=== Preflight Check Summary ===");
if (hasErrors) {
  console.error("❌ Preflight checks failed. Please fix the above errors.");
  process.exit(1);
} else {
  console.log("✅ All preflight checks passed. Application is ready.");
}
