import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const data = await reportService.getEmployeeDashboard(session);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data." }, { status: 500 });
  }
}
