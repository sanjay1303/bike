import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { setSessionCookie } from "@/lib/auth";
import { AppError } from "@/core/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, user } = await authService.loginWithPassword(body.mobile, body.password);

    const response = NextResponse.json({
      success: true,
      user,
    });

    setSessionCookie(response, token, req);
    return response;
  } catch (error: any) {
    console.error("Login controller error:", error);
    const message = error?.message || "Authentication failed. Please check your credentials.";
    const status = error?.statusCode || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
