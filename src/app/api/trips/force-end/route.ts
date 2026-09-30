import { NextRequest, NextResponse } from "next/server";
import { tripService } from "@/services/trip.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const result = await tripService.forceReleaseBike(session, body.tripId, body.endingKm);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/trips/force-end error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to force release bike." },
      { status: 500 }
    );
  }
}
