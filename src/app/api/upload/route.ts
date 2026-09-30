import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authenticateRequest } from "@/lib/permissions";
import { ValidationError } from "@/core/errors";
import { uploadToSupabaseStorage, isSupabaseStorageEnabled } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      throw new ValidationError("No file uploaded. Please select a receipt image or PDF.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 5 MB limit. Please upload a smaller photo or document." },
        { status: 400 }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format. Only JPG, PNG, WEBP, and PDF receipts are allowed." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `receipts/receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    let fileUrl: string | null = null;
    if (isSupabaseStorageEnabled()) {
      fileUrl = await uploadToSupabaseStorage(buffer, storagePath, file.type);
    }

    if (!fileUrl) {
      // Local disk fallback
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const localFileName = path.basename(storagePath);
      await writeFile(path.join(uploadDir, localFileName), buffer);
      fileUrl = `/uploads/${localFileName}`;
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload receipt proof." },
      { status: error?.statusCode || 500 }
    );
  }
}
