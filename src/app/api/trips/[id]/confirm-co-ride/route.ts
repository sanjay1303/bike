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
    const body = await req.json();
    const confirmed = Boolean(body.confirmed);

    const result = await tripService.confirmCoRide(session, id, confirmed);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/trips/[id]/confirm-co-ride error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update co-ride confirmation status." },
      { status: 500 }
    );
  }
}
