import { NextRequest, NextResponse } from "next/server";
import { settlementService } from "@/services/settlement.service";
import { authenticateAdminRequest } from "@/lib/permissions";
import { AppError, ValidationError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  try {
    if (userId) {
      const records = await settlementService.getSettlementsByUser(userId);
      return NextResponse.json({ settlements: records });
    }

    const records = await settlementService.getAllSettlements(50);
    return NextResponse.json({ settlements: records });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/settlements error:", error);
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const { userId, amount, type, notes } = body;

    if (!userId) {
      throw new ValidationError("Employee is required.");
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new ValidationError("Settlement amount must be greater than zero.");
    }
    if (!type || !["COLLECTED_FROM_EMPLOYEE", "REIMBURSED_TO_EMPLOYEE", "BALANCE_CLEAR"].includes(type)) {
      throw new ValidationError("Invalid settlement type.");
    }

    const settlement = await settlementService.settleBalance({
      userId,
      adminId: session.userId,
      amount: numAmount,
      type,
      notes,
    });

    return NextResponse.json({ success: true, settlement }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/settlements error:", error);
    return NextResponse.json({ error: "Failed to record settlement" }, { status: 500 });
  }
}
