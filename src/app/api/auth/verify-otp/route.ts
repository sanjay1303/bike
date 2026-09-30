import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { setSessionCookie } from "@/lib/auth";
import { AppError } from "@/core/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, user } = await authService.verifyOtp(body.mobile, body.code);

    const response = NextResponse.json({
      success: true,
      user,
    });

    setSessionCookie(response, token, req);
    return response;
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("verify-otp error:", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
