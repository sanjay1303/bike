import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "biketrack-default-super-secret-key-32-chars-minimum"
);

interface TokenPayload {
  userId: string;
  name: string;
  mobile: string;
  role: "ADMIN" | "EMPLOYEE";
  mustChangePassword?: boolean;
}

async function verifyToken(token?: string): Promise<TokenPayload | null> {
  if (!token) return null;
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

function getRedirectUrl(path: string, req: NextRequest): URL {
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "https");

  if (forwardedHost && !forwardedHost.includes("localhost") && req.nextUrl.host.includes("localhost")) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }
  return new URL(path, req.url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next.js internal files, static assets, images, and public uploads
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("biketrack_token")?.value;
  const session = await verifyToken(token);

  // Mandatory Password Change Barrier for Default Password users
  if (session && session.mustChangePassword) {
    if (pathname !== "/change-password") {
      return NextResponse.redirect(getRedirectUrl("/change-password", req));
    }
    return NextResponse.next();
  }

  // If user visits /change-password but doesn't have a pending requirement
  if (pathname === "/change-password") {
    if (!session) {
      return NextResponse.redirect(getRedirectUrl("/login", req));
    }
    const dest = session.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(getRedirectUrl(dest, req));
  }

  const isAuthPage = pathname === "/login" || pathname === "/verify-otp";
  const isAdminPage = pathname.startsWith("/admin");
  const isEmployeeProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/trips") ||
    pathname.startsWith("/fuel") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/profile");

  // Handle Root path "/"
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(getRedirectUrl("/login", req));
    }
    if (session.role === "ADMIN") {
      return NextResponse.redirect(getRedirectUrl("/admin/dashboard", req));
    }
    return NextResponse.redirect(getRedirectUrl("/dashboard", req));
  }

  // If already logged in and visiting login/verify-otp, send to respective dashboard
  if (isAuthPage && session) {
    if (session.role === "ADMIN") {
      return NextResponse.redirect(getRedirectUrl("/admin/dashboard", req));
    }
    return NextResponse.redirect(getRedirectUrl("/dashboard", req));
  }

  // Protect Admin pages
  if (isAdminPage) {
    if (!session) {
      const loginUrl = getRedirectUrl("/login", req);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Employee attempting to access /admin -> Redirect to /dashboard
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(getRedirectUrl("/dashboard", req));
    }
  }

  // Protect Employee / User pages
  if (isEmployeeProtectedPage) {
    if (!session) {
      const loginUrl = getRedirectUrl("/login", req);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
