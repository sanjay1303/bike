import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { authenticateAdminRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "all";

  try {
    const data = await reportService.getAdminDashboard(session, range);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load admin dashboard." }, { status: 500 });
  }
}
