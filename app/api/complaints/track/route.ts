import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId")?.trim();
    const trackingId = searchParams.get("id")?.trim().toUpperCase();

    if (userId) {
      try {
        const repo = getRepository();
        const rawComplaints = await repo.getComplaintsByUserId(userId);
        const complaints = rawComplaints.map(c => ({
          id: c.id,
          trackingId: c.tracking_id,
          title: c.title,
          description: c.description,
          category: c.category,
          status: c.status,
          address: c.address,
          severity: c.severity,
          beforePhotoUrl: c.before_photo_url,
          resolutionPhotoUrl: c.resolution_photo_url,
          rejectionCount: c.rejection_count,
          createdAt: c.created_at
        }));
        return NextResponse.json(complaints);
      } catch (dbError: any) {
        console.warn("Database offline or unreachable while querying user complaints:", dbError.message);
        return NextResponse.json(
          { message: "Service temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }
    }

    if (!trackingId) {
      return NextResponse.json(
        { message: "Tracking ID or User ID parameter is required" },
        { status: 400 }
      );
    }

    // Query the database for tracking ID
    try {
      const repo = getRepository();
      const complaint = await repo.getComplaintByTrackingId(trackingId);
      
      if (complaint) {
        const aiReport = await repo.getAIReportByComplaintId(complaint.id);
        
        return NextResponse.json({
          tracking_id: complaint.tracking_id,
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          status: complaint.status,
          address: complaint.address,
          created_at: complaint.created_at,
          trust_score: aiReport?.trust_score,
          forgery_score: aiReport?.forgery_score,
          duplicate_detected: aiReport?.duplicate_detected,
          explainable_report: aiReport?.explainable_report
        });
      }
    } catch (dbError: any) {
      console.warn("Database offline while querying tracking ID:", dbError.message);
      return NextResponse.json(
        { message: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Grievance tracking record not found on ledger" },
      { status: 404 }
    );

  } catch (err: any) {
    console.error("TRACKING API ERROR:", err.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
