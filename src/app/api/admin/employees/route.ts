import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/services/employee.service";
import { authenticateAdminRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const employees = await employeeService.listEmployees(session);
    return NextResponse.json({ employees });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/employees error:", error);
    return NextResponse.json({ error: "Failed to fetch employees." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const body = await req.json();
    const employee = await employeeService.createEmployee(session, body);
    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully.",
        employee,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/employees error:", error);
    return NextResponse.json({ error: "Failed to create employee." }, { status: 500 });
  }
}
