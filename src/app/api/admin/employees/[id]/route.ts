import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/services/employee.service";
import { authenticateAdminRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await employeeService.updateEmployee(session, id, body);
    return NextResponse.json({
      success: true,
      message: "Employee updated successfully.",
      employee: updated,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("PUT /api/admin/employees/[id] error:", error);
    return NextResponse.json({ error: "Failed to update employee." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { id } = await params;
  try {
    await employeeService.deleteEmployee(session, id);
    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("DELETE /api/admin/employees/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete employee." }, { status: 500 });
  }
}
