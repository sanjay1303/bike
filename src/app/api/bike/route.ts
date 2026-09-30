import { NextRequest, NextResponse } from "next/server";
import { bikeService } from "@/services/bike.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const bike = await bikeService.getPrimaryBike();
    return NextResponse.json({ bike });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to retrieve bike." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const updated = await bikeService.updateBikeDetails(session, body);
    return NextResponse.json({
      success: true,
      message: "Bike details updated successfully.",
      bike: updated,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/bike error:", error);
    return NextResponse.json({ error: "Failed to update bike." }, { status: 500 });
  }
}
