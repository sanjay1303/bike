import { NextRequest, NextResponse } from "next/server";
import { fuelService } from "@/services/fuel.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { id } = await params;
  try {
    const fuelEntry = await fuelService.getFuelById(session, id);
    return NextResponse.json({ fuelEntry });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to fetch fuel record." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await fuelService.updateFuelEntry(session, id, body);
    return NextResponse.json({ success: true, fuelEntry: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to update fuel record." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { id } = await params;
  try {
    await fuelService.deleteFuelEntry(session, id);
    return NextResponse.json({
      success: true,
      message: "Fuel entry deleted successfully.",
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to delete fuel record." }, { status: 500 });
  }
}
