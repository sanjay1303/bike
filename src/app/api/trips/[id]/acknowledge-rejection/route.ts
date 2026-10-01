import { NextRequest, NextResponse } from "next/server";
import { tripService } from "@/services/trip.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const { id } = await params;
    const result = await tripService.acknowledgeCoRideRejection(session, id);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/trips/[id]/acknowledge-rejection error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to acknowledge rejection." },
      { status: 500 }
    );
  }
}
