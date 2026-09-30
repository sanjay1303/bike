import { NextRequest, NextResponse } from "next/server";
import { tripService } from "@/services/trip.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { searchParams } = new URL(req.url);
  const purpose = searchParams.get("purpose") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const search = searchParams.get("search") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const result = await tripService.listTrips(
      session,
      { userId: employeeId, purpose, search, startDate, endDate },
      page,
      limit
    );
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/trips error:", error);
    return NextResponse.json({ error: "Failed to fetch trips." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const trip = await tripService.createTrip(session, body);
    return NextResponse.json({ success: true, trip }, { status: 201 });
  } catch (error: any) {
    if (error?.inUse) {
      return NextResponse.json(
        {
          error: error.message,
          inUse: true,
          currentRider: error.currentRider,
        },
        { status: error.statusCode || 409 }
      );
    }
    console.error("POST /api/trips error:", error);
    const message = error?.message || "Failed to create trip record.";
    const status = error?.statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
