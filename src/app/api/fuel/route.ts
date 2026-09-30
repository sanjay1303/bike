import { NextRequest, NextResponse } from "next/server";
import { fuelService } from "@/services/fuel.service";
import { authenticateRequest } from "@/lib/permissions";
import { AppError } from "@/core/errors";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const result = await fuelService.listFuelEntries(
      session,
      { userId: employeeId, startDate, endDate },
      page,
      limit
    );
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/fuel error:", error);
    return NextResponse.json({ error: "Failed to fetch fuel records." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    let currentKm: number;
    let litres: number;
    let amount: number;
    let remarks: string | null = null;
    let date = new Date();
    let billImageUrl: string | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      currentKm = parseInt(formData.get("currentKm") as string, 10);
      litres = parseFloat(formData.get("litres") as string);
      amount = parseFloat(formData.get("amount") as string);
      remarks = (formData.get("remarks") as string) || null;
      const dateVal = formData.get("date") as string;
      if (dateVal) date = new Date(dateVal);

      // Handle bill receipt upload
      const file = formData.get("billFile") as File | null;
      if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Bill image exceeds 5 MB limit. Please upload a smaller file." },
            { status: 400 }
          );
        }

        const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
        if (!validTypes.includes(file.type)) {
          return NextResponse.json(
            { error: "Only JPG, PNG, and PDF files are allowed for petrol bills." },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        billImageUrl = `/uploads/${fileName}`;
      } else {
        billImageUrl = (formData.get("billImageUrl") as string) || null;
      }
    } else {
      const body = await req.json();
      currentKm = parseInt(body.currentKm, 10);
      litres = parseFloat(body.litres);
      amount = parseFloat(body.amount);
      remarks = body.remarks ? body.remarks.trim() : null;
      if (body.date) date = new Date(body.date);
      billImageUrl = body.billImageUrl || null;
    }

    const fuelEntry = await fuelService.createFuelEntry(session, {
      currentKm,
      litres,
      amount,
      remarks,
      date,
      billImageUrl,
    });

    return NextResponse.json({ success: true, fuelEntry }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/fuel error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create fuel entry." },
      { status: 500 }
    );
  }
}
