import { NextRequest, NextResponse } from "next/server";
import { tripService } from "@/services/trip.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const status = await tripService.getActiveBikeStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/bike/live-status error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve live bike status.", details: String(error) },
      { status: 500 }
    );
  }
}
