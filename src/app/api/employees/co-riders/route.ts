import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    // Return all active employees except current user
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        id: { not: session.userId },
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ coRiders: users });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/employees/co-riders error:", error);
    return NextResponse.json({ error: "Failed to load team members." }, { status: 500 });
  }
}
