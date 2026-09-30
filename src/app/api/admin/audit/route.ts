import { NextRequest, NextResponse } from "next/server";
import { auditRepository } from "@/repositories/audit.repository";
import { authenticateAdminRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const logs = await auditRepository.findRecent(30);
    return NextResponse.json({ logs });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs." }, { status: 500 });
  }
}
