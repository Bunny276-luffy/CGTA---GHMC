import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackingId = searchParams.get("id")?.trim().toUpperCase();

    if (!trackingId) {
      return NextResponse.json(
        { message: "Tracking ID parameter is required" },
        { status: 400 }
      );
    }

    // 1. Query the live PostgreSQL database
    const res = await db.query(`
      SELECT c.tracking_id, c.title, c.description, c.category, c.status, c.address, c.created_at,
             r.trust_score, r.forgery_score, r.duplicate_detected, r.explainable_report
      FROM complaints c
      LEFT JOIN ai_reports r ON c.id = r.complaint_id
      WHERE c.tracking_id = $1
    `, [trackingId]);

    if (res.rowCount && res.rowCount > 0) {
      return NextResponse.json(res.rows[0]);
    }

    // 2. Fallback to active demonstration seed IDs if database is unseeded
    const seeds: Record<string, any> = {
      "CGTA-2026-0001": {
        tracking_id: "CGTA-2026-0001",
        title: "Jubilee Hills Pothole Repair",
        description: "Large deep pothole at Road No. 36 near metro pillar 12.",
        category: "Road Repair",
        status: "CLOSED",
        address: "Jubilee Hills Rd 36, Hyderabad",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        trust_score: 98.4,
        forgery_score: 0.0,
        duplicate_detected: false,
        explainable_report: "PASS: Coordinate proximity verified within 12m of reported location. Photo metadata verified as raw camera output."
      },
      "CGTA-2026-0002": {
        tracking_id: "CGTA-2026-0002",
        title: "Garbage Overflow at Madhapur",
        description: "Open garbage dump piling up near tech park entry.",
        category: "Waste Disposal",
        status: "RESOLVED",
        address: "Madhapur Main Rd, Hyderabad",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        trust_score: 95.1,
        forgery_score: 5.0,
        duplicate_detected: false,
        explainable_report: "PASS: Coordinate proximity verified within 24m of reported location. Warning: minor header discrepancy."
      }
    };

    if (seeds[trackingId]) {
      return NextResponse.json(seeds[trackingId]);
    }

    return NextResponse.json(
      { message: "Grievance tracking record not found on ledger" },
      { status: 404 }
    );

  } catch (err: any) {
    console.error("TRACKING API ERROR:", err.message);
    return NextResponse.json(
      { message: "Failed to fetch ledger details" },
      { status: 500 }
    );
  }
}
