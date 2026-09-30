import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { getSession, setSessionCookie } from "@/lib/auth";
import { AppError, UnauthorizedError } from "@/core/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      throw new UnauthorizedError("You must be signed in to change your password.");
    }

    const body = await req.json();
    const result = await authService.changePassword(
      session.userId,
      body.currentPassword,
      body.newPassword
    );

    const response = NextResponse.json(result);
    if (result.token) {
      setSessionCookie(response, result.token, req);
    }
    return response;
  } catch (error: any) {
    console.error("Change password controller error:", error);
    const message = error?.message || "Failed to change password. Please try again.";
    const status = error?.statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
