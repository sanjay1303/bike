import { NextRequest, NextResponse } from "next/server";
import { getSession, UserSession } from "./auth";

export interface AuthCheckResult {
  session: UserSession | null;
  errorResponse?: NextResponse;
}

/**
 * Validates that an API request has a valid, active session.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthCheckResult> {
  const session = await getSession(req);
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }
  return { session };
}

/**
 * Validates that an API request comes from an ADMIN.
 */
export async function authenticateAdminRequest(req: NextRequest): Promise<AuthCheckResult> {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse) return { session: null, errorResponse };

  if (session?.role !== "ADMIN") {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Access denied. Administrator privileges required." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/**
 * Business rule check: Employee can only access/modify their own records.
 * Admin can access/modify any record.
 */
export function isAuthorizedForRecord(session: UserSession, recordOwnerUserId: string): boolean {
  if (session.role === "ADMIN") return true;
  return session.userId === recordOwnerUserId;
}
