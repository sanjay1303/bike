"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Gauge,
  X,
  Keyboard,
  Video,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";

export interface OdometerPhotoScannerProps {
  label: string;
  type: "start" | "end";
  value: string; // Current KM string
  previousValidKm: number; // Lowest allowed KM (for validation)
  confirmedPhotoUrl: string | null;
  readingMethod: "PHOTO" | "MANUAL";
  onReadingConfirmed: (
    km: number,
    photoUrl: string | null,
    method: "PHOTO" | "MANUAL",
    confidence: number | null
  ) => void;
  disabled?: boolean;
}

/**
 * Client-side image optimizer:
 * Downscales ultra-high resolution mobile photos (10MB+ down to ~800KB)
 * and converts HEIC/raw formats into universal image/jpeg before upload.
 */
async function optimizeImageForUpload(file: File): Promise<{ blob: Blob; fileName: string }> {
  // If file is already small standard format, return directly
  if (file.size <= 2 * 1024 * 1024 && (file.type === "image/jpeg" || file.type === "image/png")) {
    return { blob: file, fileName: file.name };
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1920;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return resolve({ blob: file, fileName: file.name });
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
            resolve({ blob, fileName: cleanName });
          } else {
            resolve({ blob: file, fileName: file.name });
          }
        },
        "image/jpeg",
        0.88
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, fileName: file.name });
    };

    img.src = url;
  });
}

export function OdometerPhotoScanner({
  label,
  type,
  value,
  previousValidKm,
  confirmedPhotoUrl,
  readingMethod,
  onReadingConfirmed,
  disabled = false,
}: OdometerPhotoScannerProps) {
  const toast = useToast();

  const cameraInputId = `odometer-camera-${type}`;
  const galleryInputId = `odometer-gallery-${type}`;

  const editInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(confirmedPhotoUrl);
  const [analyzing, setAnalyzing] = useState(false);
  const [editableKm, setEditableKm] = useState<string>(value || "");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [confidenceLabel, setConfidenceLabel] = useState<"HIGH" | "MEDIUM" | "LOW" | "NONE">("HIGH");
  const [scanState, setScanState] = useState<"idle" | "detected" | "failed" | "confirmed" | "manual">(
    value ? "confirmed" : "idle"
  );
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(confirmedPhotoUrl);

  // Live in-browser webcam viewfinder modal state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [hasWebcamSupport, setHasWebcamSupport] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      setHasWebcamSupport(true);
    }
  }, []);

  // Stop video stream on unmount or modal close
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const startLiveCamera = async () => {
    try {
      setIsLiveCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Webcam error:", err);
      stopLiveCamera();
      toast.error("Could not access live camera. Please use 'Take Photo' or 'Upload Photo'.");
    }
  };

  const captureLiveFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopLiveCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
          handleFileSelected(file);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Main file processor (handles both native camera snaps and gallery uploads)
  const handleFileSelected = async (file: File) => {
    // 1. Validate file exists and is an image
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

    if (!isImage) {
      toast.error("Please upload an image photo of the odometer.");
      return;
    }

    // 2. Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setAnalyzing(true);
    setScanState("idle");

    try {
      // 3. Optimize large camera files client-side
      const { blob, fileName } = await optimizeImageForUpload(file);

      const formData = new FormData();
      formData.append("photo", blob, fileName);

      const res = await fetch("/api/ocr/odometer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process photo.");
      }

      setUploadedPhotoUrl(data.photoUrl);

      if (data.success && typeof data.reading === "number") {
        setEditableKm(data.reading.toString());
        setConfidence(data.confidence ?? 0.85);
        setConfidenceLabel(data.confidenceLabel || "MEDIUM");
        setScanState("detected");
      } else {
        setScanState("failed");
      }
    } catch (err: any) {
      console.error("OCR process error:", err);
      toast.error(err.message || "Failed to analyze odometer photo.");
      setScanState("failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // Validation logic against previous valid bike KM
  const parsedKm = Math.round(parseFloat(editableKm) * 10) / 10;
  const isInvalidLowerKm = !isNaN(parsedKm) && (
    type === "end" ? parsedKm <= previousValidKm : parsedKm < previousValidKm
  );

  // Confirming the reading
  const handleConfirm = () => {
    if (isNaN(parsedKm) || parsedKm < 0) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }

    if (isInvalidLowerKm) {
      toast.error(
        type === "end" && parsedKm === previousValidKm
          ? `The ending reading cannot be the same as starting reading (${previousValidKm} km).`
          : `The new reading (${parsedKm} km) cannot be lower than previous reading (${previousValidKm} km).`
      );
      return;
    }

    onReadingConfirmed(parsedKm, uploadedPhotoUrl, "PHOTO", confidence);
    setScanState("confirmed");
    toast.success(`${label} confirmed: ${parsedKm.toLocaleString("en-IN")} km`);
  };

  // Retake photo action
  const handleRetake = () => {
    setEditableKm("");
    setScanState("idle");
  };

  // Fallback to manual entry
  const handleManualFallback = () => {
    setScanState("manual");
  };

  // Manual input confirmation
  const handleManualConfirm = () => {
    if (isNaN(parsedKm) || parsedKm < 0) {
      toast.error("Please enter a valid number.");
      return;
    }
    if (isInvalidLowerKm) {
      toast.error(
        type === "end" && parsedKm === previousValidKm
          ? `The ending reading cannot be the same as starting reading (${previousValidKm} km).`
          : `Reading (${parsedKm} km) cannot be lower than previous KM (${previousValidKm} km).`
      );
      return;
    }
    onReadingConfirmed(parsedKm, null, "MANUAL", null);
    setScanState("confirmed");
  };

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 transition-all">
      {/* Native Mobile OS Camera Input (Triggers camera directly on iOS & Android) */}
      <input
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || analyzing}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileSelected(e.target.files[0]);
          }
          // Reset input value so taking photo again triggers onChange every time
          e.target.value = "";
        }}
      />

      {/* Gallery / Files Input */}
      <input
        id={galleryInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || analyzing}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileSelected(e.target.files[0]);
          }
          e.target.value = "";
        }}
      />

      {/* Header Label Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              {label}
            </span>
            <span className="text-[11px] text-slate-500">
              {type === "start" ? "Record starting odometer from photo" : "Record ending odometer from photo"}
            </span>
          </div>
        </div>

        {scanState === "confirmed" && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{readingMethod === "PHOTO" ? "Verified Photo" : "Manual Entry"}</span>
          </span>
        )}
      </div>

      {/* ===================================================================== */}
      {/* LIVE WEBCAM MODAL (Desktop / In-Browser Viewfinder)                    */}
      {/* ===================================================================== */}
      {isLiveCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full border border-slate-700 shadow-2xl relative">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <span className="text-white text-xs font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Live Odometer Camera
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* Aiming guideline */}
              <div className="absolute inset-x-8 inset-y-16 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-bold text-white bg-black/60 px-3 py-1 rounded-full">
                  Align odometer numbers inside box
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between bg-slate-900">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureLiveFrame}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STATE 1: ANALYZING SPINNER                                             */}
      {/* ===================================================================== */}
      {analyzing && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-2xs flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
          {previewUrl && (
            <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-2xs mb-1">
              <Image src={previewUrl} alt="Odometer photo" fill className="object-cover opacity-60" />
              <div className="absolute inset-0 bg-emerald-900/20 backdrop-blur-2xs" />
            </div>
          )}
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Scanning odometer reading with AI...</span>
          </div>
          <p className="text-[11px] text-slate-400">Extracting numbers from odometer photo</p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STATE 2: DETECTED READING & CONFIRMATION                               */}
      {/* ===================================================================== */}
      {!analyzing && scanState === "detected" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            {/* Photo preview thumbnail */}
            {previewUrl && (
              <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                <Image src={previewUrl} alt="Odometer preview" fill className="object-cover" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Odometer Reading</span>
              </div>

              {/* Detected or Editable Field */}
              <div className="mt-1 flex items-baseline gap-2">
                <input
                  ref={editInputRef}
                  type="number"
                  step="any"
                  min="0"
                  value={editableKm}
                  onChange={(e) => setEditableKm(e.target.value)}
                  className={`text-2xl sm:text-3xl font-black font-mono tracking-tight px-3 py-1 rounded-xl border transition ${
                    isInvalidLowerKm
                      ? "border-rose-400 text-rose-700 bg-rose-50"
                      : "border-emerald-300 text-slate-900 bg-emerald-50/40 focus:bg-white focus:border-emerald-500"
                  } w-44 focus:outline-hidden`}
                />
                <span className="text-base font-bold text-slate-500">km</span>
              </div>

              {/* Confidence Badge */}
              <div className="mt-1.5 flex items-center gap-2">
                {confidenceLabel === "HIGH" ? (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Reading detected ({Math.round((confidence || 0.9) * 100)}% confidence)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Please verify or edit reading if needed</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Validation Error: Lower than previous KM */}
          {isInvalidLowerKm && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1 animate-in shake">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>⚠️ Invalid Odometer Reading</span>
              </div>
              <p className="text-[11px] text-rose-700 pl-5">
                {type === "end" && parsedKm === previousValidKm
                  ? `Ending reading (${parsedKm} km) cannot be the same as starting reading (${previousValidKm} km). Journey distance must be greater than 0.`
                  : `The new reading (${parsedKm} km) is lower than the previous reading (${previousValidKm} km). Please retake the photo or correct the reading.`}
              </p>
            </div>
          )}

          {/* Prompt & Confirmation Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-xs font-semibold text-slate-600">Is this correct?</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isInvalidLowerKm || !editableKm}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STATE 3: OCR FAILURE STATE                                            */}
      {/* ===================================================================== */}
      {!analyzing && scanState === "failed" && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">We couldn&apos;t detect the digits automatically.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The dial might be angled or have glare. You can enter the KM reading directly below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRetake}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>

            <button
              type="button"
              onClick={handleManualFallback}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Enter KM Manually</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STATE 4: CONFIRMED READING DISPLAY                                     */}
      {/* ===================================================================== */}
      {!analyzing && scanState === "confirmed" && (
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {uploadedPhotoUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <Image src={uploadedPhotoUrl} alt="Odometer" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono font-bold text-sm">
                KM
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black font-mono text-slate-900">
                  {parseInt(value, 10).toLocaleString("en-IN")} km
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {readingMethod === "PHOTO" ? "✓ Photo Verified" : "Manual"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {readingMethod === "PHOTO" ? "Odometer reading detected & confirmed" : "Manually logged"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetake}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-1 transition cursor-pointer"
          >
            Change / Retake
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STATE 5: MANUAL FALLBACK ENTRY                                         */}
      {/* ===================================================================== */}
      {!analyzing && scanState === "manual" && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Manual Odometer Entry (KM)</span>
              <span className="text-[10px] text-slate-400 font-normal">Min: {previousValidKm} km</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={editableKm}
                onChange={(e) => setEditableKm(e.target.value)}
                placeholder="7496"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-medium focus:outline-hidden ${
                  isInvalidLowerKm
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-300 focus:border-emerald-500 bg-white"
                }`}
              />
              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={isInvalidLowerKm || !editableKm}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer"
              >
                Set KM
              </button>
            </div>
          </div>

          {isInvalidLowerKm && (
            <p className="text-xs font-medium text-rose-600">
              ⚠️ {type === "end" && parsedKm === previousValidKm
                ? `Ending reading (${parsedKm} km) cannot be the same as starting reading (${previousValidKm} km).`
                : `Reading (${parsedKm} km) cannot be lower than previous KM (${previousValidKm} km).`}
            </p>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRetake}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Back to Photo Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* INITIAL IDLE ACTION BUTTONS                                            */}
      {/* ===================================================================== */}
      {!analyzing && scanState === "idle" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-700">Take Odometer Photo</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Primary Action: Native Device Camera (opens camera directly on phone) */}
            <label
              htmlFor={cameraInputId}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer active:scale-98 select-none ${
                disabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>📷 Take Photo</span>
            </label>

            {/* Secondary Action: Choose from Photo Gallery / Files */}
            <label
              htmlFor={galleryInputId}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition cursor-pointer select-none ${
                disabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Photo</span>
            </label>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            {hasWebcamSupport ? (
              <button
                type="button"
                onClick={startLiveCamera}
                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Open Live Camera Viewfinder</span>
              </button>
            ) : (
              <span>Allowed: All image formats</span>
            )}

            <button
              type="button"
              onClick={handleManualFallback}
              className="text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
            >
              Enter KM manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
