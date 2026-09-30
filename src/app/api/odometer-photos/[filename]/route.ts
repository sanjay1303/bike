import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { authenticateRequest } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { filename } = await params;

  // Sanitize filename against directory traversal
  const sanitized = path.basename(filename);
  if (sanitized !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid photo filename." }, { status: 400 });
  }

  // Permission Check:
  // Admins can view any photo.
  // Employees can only view photos they uploaded (encoded in prefix or linked to their trips).
  let isAuthorized = session.role === "ADMIN";

  if (!isAuthorized) {
    if (sanitized.startsWith(`odo_${session.userId}_`)) {
      isAuthorized = true;
    } else {
      // Check if photo is linked to an existing trip owned by this user
      const photoPath = `/api/odometer-photos/${sanitized}`;
      const trip = await prisma.trip.findFirst({
        where: {
          userId: session.userId,
          OR: [{ startOdometerPhoto: photoPath }, { endOdometerPhoto: photoPath }],
        },
      });
      if (trip) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Access denied. You can only access your own odometer photos." },
      { status: 403 }
    );
  }

  const filePath = path.join(process.cwd(), "storage", "odometer-photos", sanitized);

  try {
    const fileBuffer = await readFile(filePath);
    const ext = sanitized.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const contentType = (ext && mimeMap[ext]) || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
}
