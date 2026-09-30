import { NextRequest, NextResponse } from "next/server";
import { tripService } from "@/services/trip.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError, BikeInUseError } from "@/core/errors";

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const result = await tripService.startTrip(session, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof BikeInUseError) {
      return NextResponse.json(
        {
          error: error.message,
          inUse: true,
          currentRider: error.currentRider,
        },
        { status: error.statusCode }
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/trips/start error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start bike ride." },
      { status: 500 }
    );
  }
}
