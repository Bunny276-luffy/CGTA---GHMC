import { db } from "../../lib/db";

async function migrate() {
  const hasDbUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0;
  if (!hasDbUrl) {
    console.log("DATABASE MIGRATION BLOCKED — DATABASE_URL environment variable is not defined.");
    return;
  }

  try {
    console.log("Running Stage 10 Database Migrations...");
    
    // Check connection first
    await db.query("SELECT NOW()");

    // Add image_sha256 column
    await db.query(
      `ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS image_sha256 VARCHAR(64)`
    );
    console.log("✅ Column 'image_sha256' verified/added to 'ai_reports'.");

    // Add image_phash column
    await db.query(
      `ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS image_phash VARCHAR(64)`
    );
    console.log("✅ Column 'image_phash' verified/added to 'ai_reports'.");

    // Create index on image_sha256
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_reports_image_sha256 ON ai_reports(image_sha256)`
    );
    console.log("✅ Index 'idx_ai_reports_image_sha256' verified/created.");

    // Create index on image_phash
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_reports_image_phash ON ai_reports(image_phash)`
    );
    console.log("✅ Index 'idx_ai_reports_image_phash' verified/created.");

    console.log("Stage 10 Database Migrations completed successfully!");
  } catch (err: any) {
    console.error("DATABASE MIGRATION FAILED / BLOCKED:", err.message);
  }
}

migrate();
