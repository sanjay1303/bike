import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { AppError } from "@/core/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await authService.sendOtp(body.mobile);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("send-otp error:", error);
    return NextResponse.json(
      { error: "Something went wrong while sending OTP. Please try again." },
      { status: 500 }
    );
  }
}
