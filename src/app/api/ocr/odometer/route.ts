import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { authenticateRequest } from "@/lib/permissions";
import { odometerOcrService } from "@/services/odometer-ocr.service";
import { uploadToSupabaseStorage, isSupabaseStorageEnabled } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await authenticateRequest(req);
  if (errorResponse || !session) return errorResponse;

  try {
    const formData = await req.formData();
    const file = (formData.get("photo") || formData.get("file")) as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No odometer photo uploaded. Please take or select a photo." },
        { status: 400 }
      );
    }

    // 1. Validate File Size (Maximum 25 MB to support high-res phone camera shots)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo exceeds the maximum 25 MB limit. Please take a lighter photo." },
        { status: 400 }
      );
    }

    // 2. Validate Allowed File Formats: Any image format (JPEG, PNG, WEBP, HEIC, HEIF, etc.)
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isImage =
      file.type.startsWith("image/") ||
      ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext);

    if (!isImage) {
      return NextResponse.json(
        { error: "Invalid photo format. Please upload a clear photo of the odometer." },
        { status: 400 }
      );
    }

    // 3. Normalize Image Buffer to Standard JPEG using Sharp
    const rawBytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(rawBytes);

    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(rawBuffer)
        .rotate() // Auto-orient based on EXIF camera orientation
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      processedBuffer = rawBuffer;
    }

    // 4. Secure Storage (Supabase Storage with local backup)
    const storageDir = path.join(process.cwd(), "storage", "odometer-photos");
    await mkdir(storageDir, { recursive: true });

    const fileName = `odo_${session.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
    const filePath = path.join(storageDir, fileName);

    await writeFile(filePath, processedBuffer);

    let photoUrl: string | null = null;
    if (isSupabaseStorageEnabled()) {
      photoUrl = await uploadToSupabaseStorage(
        processedBuffer,
        `odometer-photos/${fileName}`,
        "image/jpeg"
      );
    }

    if (!photoUrl) {
      photoUrl = `/api/odometer-photos/${fileName}`;
    }

    // 5. Run OCR Engine on normalized JPEG
    const ocrResult = await odometerOcrService.extractReading(
      processedBuffer,
      "image/jpeg",
      file.name,
      filePath
    );

    return NextResponse.json({
      success: ocrResult.success,
      reading: ocrResult.reading,
      confidence: ocrResult.confidence,
      confidenceLabel: ocrResult.confidenceLabel,
      errorMessage: ocrResult.errorMessage,
      rawText: ocrResult.rawText,
      photoUrl,
      fileName,
    });
  } catch (error: any) {
    console.error("POST /api/ocr/odometer error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process odometer photo." },
      { status: 500 }
    );
  }
}
