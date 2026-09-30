import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export interface UserSession {
  userId: string;
  name: string;
  mobile: string;
  role: "ADMIN" | "EMPLOYEE";
  mustChangePassword?: boolean;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "biketrack-default-super-secret-key-32-chars-minimum"
);

const COOKIE_NAME = "biketrack_token";

/**
 * Sign a JWT session token valid for 7 days
 */
export async function signSessionToken(payload: UserSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      mobile: payload.mobile as string,
      role: payload.role as "ADMIN" | "EMPLOYEE",
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

/**
 * Extract session from incoming Next.js API request or cookies
 */
export async function getSession(req?: NextRequest): Promise<UserSession | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return await verifySessionToken(token);
}

/**
 * Attach the session token to response as an HttpOnly, secure cookie
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  reqOrSecure?: NextRequest | boolean
): void {
  let isSecure = process.env.NODE_ENV === "production";
  if (typeof reqOrSecure === "boolean") {
    isSecure = reqOrSecure || isSecure;
  } else if (reqOrSecure) {
    const proto = reqOrSecure.headers.get("x-forwarded-proto") || reqOrSecure.nextUrl?.protocol;
    const host = reqOrSecure.headers.get("host") || "";
    isSecure =
      isSecure ||
      proto === "https" ||
      proto === "https:" ||
      host.includes("trycloudflare.com") ||
      host.includes("loca.lt") ||
      host.includes("ngrok");
  }

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(
  response: NextResponse,
  reqOrSecure?: NextRequest | boolean
): void {
  let isSecure = process.env.NODE_ENV === "production";
  if (typeof reqOrSecure === "boolean") {
    isSecure = reqOrSecure || isSecure;
  } else if (reqOrSecure) {
    const proto = reqOrSecure.headers.get("x-forwarded-proto") || reqOrSecure.nextUrl?.protocol;
    const host = reqOrSecure.headers.get("host") || "";
    isSecure =
      isSecure ||
      proto === "https" ||
      proto === "https:" ||
      host.includes("trycloudflare.com") ||
      host.includes("loca.lt") ||
      host.includes("ngrok");
  }

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
