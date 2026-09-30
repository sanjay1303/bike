"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Gauge,
  X,
  ArrowRight,
  Bike,
  Check,
  Video,
  Tag,
  Users,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { tripsApi } from "@/api";
import { Bike as BikeType, ActiveRiderInfo } from "@/types";

interface QuickOdometerScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: BikeType | null;
  onOdometerUpdated?: () => void;
  onBikeInUse?: (rider: ActiveRiderInfo) => void;
}

/**
 * Client-side image optimizer:
 * Downscales ultra-high resolution mobile camera shots (10MB+ down to ~800KB)
 * and ensures universal JPEG compatibility before uploading to OCR.
 */
async function optimizeImageForUpload(file: File): Promise<{ blob: Blob; fileName: string }> {
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

export function QuickOdometerScannerModal({
  isOpen,
  onClose,
  bike,
  onOdometerUpdated,
  onBikeInUse,
}: QuickOdometerScannerModalProps) {
  const router = useRouter();
  const toast = useToast();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editableKm, setEditableKm] = useState<string>("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [confidenceLabel, setConfidenceLabel] = useState<"HIGH" | "MEDIUM" | "LOW" | "NONE">("HIGH");
  const [scanState, setScanState] = useState<"idle" | "detected" | "failed">("idle");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string>("Client Visit");
  const [startingRide, setStartingRide] = useState<boolean>(false);

  const [isDoubleRide, setIsDoubleRide] = useState(false);
  const [coRiderId, setCoRiderId] = useState<string>("");
  const [fuelSplitType, setFuelSplitType] = useState<string>("SPLIT_EQUALLY");
  const [coRidersList, setCoRidersList] = useState<Array<{ id: string; name: string; mobile: string }>>([]);

  // Live in-browser webcam viewfinder state (for laptop / tablet testing)
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [hasWebcamSupport, setHasWebcamSupport] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
      setHasWebcamSupport(true);
    }
  }, []);

  // Fetch active co-riders when modal opens
  useEffect(() => {
    if (isOpen) {
      tripsApi
        .getCoRiders()
        .then((res) => {
          if (res?.coRiders) {
            setCoRidersList(res.coRiders);
            if (res.coRiders.length > 0) {
              setCoRiderId((prev) => prev || res.coRiders[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Reset state whenever modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      stopLiveCamera();
      setPreviewUrl(null);
      setAnalyzing(false);
      setEditableKm("");
      setConfidence(null);
      setScanState("idle");
    }
  }, [isOpen]);

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
      toast.error("Could not access webcam. Please use 'Take Photo' or 'Upload Photo'.");
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
          const file = new File([blob], `live_quick_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
          handleFileSelected(file);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFileSelected = async (file: File) => {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

    if (!isImage) {
      toast.error("Please upload an image photo of the odometer.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setAnalyzing(true);
    setScanState("idle");

    try {
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
        setConfidenceLabel(data.confidenceLabel || "HIGH");
        setScanState("detected");
        toast.success(`Odometer detected: ${data.reading.toLocaleString("en-IN")} km`);
      } else {
        setScanState("failed");
        setEditableKm(bike ? bike.currentKm.toString() : "");
        toast.error("Could not clearly detect digits. Please confirm or adjust manually.");
      }
    } catch (err: any) {
      console.error("Quick Scan OCR error:", err);
      toast.error(err.message || "Failed to analyze odometer photo.");
      setScanState("failed");
      setEditableKm(bike ? bike.currentKm.toString() : "");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setEditableKm("");
    setScanState("idle");
  };

  const parsedKm = parseInt(editableKm, 10);
  const isValidKm = !isNaN(parsedKm) && parsedKm >= 0;

  // Start active ride on the bike (check out bike)
  const handleStartBike = async () => {
    if (!isValidKm) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }
    if (!purpose.trim()) {
      toast.error("Please enter trip purpose.");
      return;
    }
    if (isDoubleRide && !coRiderId) {
      toast.error("Please select a co-rider for a double ride.");
      return;
    }

    try {
      setStartingRide(true);
      await tripsApi.startTrip({
        startingKm: parsedKm,
        purpose: purpose.trim(),
        startOdometerPhoto: uploadedPhotoUrl,
        startReadingMethod: uploadedPhotoUrl ? "PHOTO" : "MANUAL",
        startOcrConfidence: confidence,
        isDoubleRide,
        coRiderId: isDoubleRide ? coRiderId : null,
        fuelSplitType: isDoubleRide ? fuelSplitType : "NONE",
      });

      toast.success(
        `Bike started! Ride in progress from ${parsedKm.toLocaleString("en-IN")} km${isDoubleRide ? " (Double Ride)" : ""}.`
      );
      onClose();
      if (onOdometerUpdated) onOdometerUpdated();
    } catch (err: any) {
      if (err.inUse || err.currentRider) {
        onClose();
        if (onBikeInUse && err.currentRider) {
          onBikeInUse(err.currentRider);
        } else {
          toast.error(err.message || "Bike is currently in use by another user.");
        }
      } else {
        toast.error(err.message || "Failed to start bike ride.");
      }
    } finally {
      setStartingRide(false);
    }
  };

  // Navigate to Add Trip page with pre-filled Starting KM (manual fallback)
  const handleStartTrip = () => {
    if (!isValidKm) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }
    onClose();
    const doubleQuery = isDoubleRide ? `&isDouble=true&coRider=${coRiderId}&fuelSplit=${fuelSplitType}` : "";
    router.push(`/trips/new?startKm=${parsedKm}${doubleQuery}`);
  };

  // Navigate to Add Trip page with pre-filled Ending KM
  const handleEndTrip = () => {
    if (!isValidKm) {
      toast.error("Please enter a valid odometer reading.");
      return;
    }
    onClose();
    router.push(`/trips/new?endKm=${parsedKm}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Quick Scan Odometer</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">
                  AI OCR
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Snap or upload bike odometer for instant reading
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Company Bike Info Banner */}
          {bike && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Bike className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {bike.name} <strong className="text-slate-900">({bike.registrationNumber})</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Current Record</span>
                <span className="font-mono font-bold text-emerald-700">
                  {bike.currentKm.toLocaleString("en-IN")} km
                </span>
              </div>
            </div>
          )}

          {/* Hidden Native File Inputs */}
          <input
            id="quick-scan-camera"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />

          <input
            id="quick-scan-gallery"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />

          {/* Live Webcam Viewfinder Modal Overlay */}
          {isLiveCameraOpen && (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700 aspect-4/3 flex flex-col items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-20 border-2 border-dashed border-emerald-400 rounded-xl flex items-center justify-center bg-black/20">
                  <span className="text-[10px] text-white font-mono bg-black/60 px-2 py-0.5 rounded">
                    Align Odometer Digits Here
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 flex items-center gap-3 z-10">
                <button
                  type="button"
                  onClick={stopLiveCamera}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureLiveFrame}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* Initial Capture Triggers (When no photo chosen yet) */}
          {!previewUrl && !isLiveCameraOpen && (
            <div className="space-y-3">
              {/* Big Native Camera Label Trigger (Works on iOS, Android & HTTP local IP) */}
              <label
                htmlFor="quick-scan-camera"
                className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-500 bg-gradient-to-b from-emerald-50/60 to-white hover:bg-emerald-50/80 flex flex-col items-center justify-center gap-2 cursor-pointer transition shadow-2xs group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition duration-200">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-slate-900 block">
                    Take Photo with Camera
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Tap to open phone camera & snap odometer
                  </span>
                </div>
              </label>

              {/* Secondary Options: Gallery or Webcam */}
              <div className="grid grid-cols-2 gap-2.5">
                <label
                  htmlFor="quick-scan-gallery"
                  className="py-3 px-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Upload Photo</span>
                </label>

                {hasWebcamSupport ? (
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="py-3 px-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                  >
                    <Video className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Live Viewfinder</span>
                  </button>
                ) : (
                  <div className="py-3 px-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 text-xs font-medium flex items-center justify-center">
                    <span>Quick Scan Ready</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {analyzing && (
            <div className="py-8 px-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center space-y-3 animate-in fade-in">
              <div className="relative w-12 h-12 mx-auto">
                <div className="w-12 h-12 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
                <Sparkles className="w-5 h-5 text-emerald-600 absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Reading Odometer Digits...</p>
                <p className="text-xs text-slate-500 mt-1">
                  On-device AI OCR is scanning numbers from your photo
                </p>
              </div>
            </div>
          )}

          {/* Detected / Scanned Result View */}
          {previewUrl && !analyzing && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Photo Preview Thumbnail & Status */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-14 rounded-xl overflow-hidden border border-slate-200 bg-black shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Scanned odometer photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Captured Odometer Photo</span>
                      {scanState === "detected" && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {confidence !== null
                        ? `AI Confidence: ${Math.round(confidence * 100)}% (${confidenceLabel})`
                        : "Photo attached"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>

              {/* Detected Reading Display Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-2 border-emerald-300/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-emerald-600" />
                    Detected Reading (KM)
                  </span>
                  {scanState === "detected" && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Auto-detected
                    </span>
                  )}
                </div>

                {/* Big Number Input (Editable for confirmation) */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      value={editableKm}
                      onChange={(e) => setEditableKm(e.target.value)}
                      placeholder="e.g. 7496"
                      className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-emerald-400 font-mono text-2xl sm:text-3xl font-black text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 focus:outline-hidden tracking-wider shadow-inner"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      KM
                    </span>
                  </div>
                </div>

                {/* Purpose Selection for Ride Checkout */}
                <div className="pt-2 border-t border-emerald-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Trip Purpose *
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Client Visit, Site Inspection..."
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                    <span className="text-[10px] text-slate-400">Suggestions:</span>
                    {["Client Visit", "Site Visit", "Office Work", "Bank", "Meeting", "Delivery"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurpose(p)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer ${
                          purpose === p
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ride Type Selector (Solo vs Double Ride) */}
                <div className="pt-2 border-t border-emerald-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Ride Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDoubleRide(false)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        !isDoubleRide
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span>👤 Solo Ride</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDoubleRide(true)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isDoubleRide
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <span>👥 Double Ride (2 Riders)</span>
                    </button>
                  </div>

                  {isDoubleRide && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                          Select Co-Rider / Second User *
                        </label>
                        <select
                          value={coRiderId}
                          onChange={(e) => setCoRiderId(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-300 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                        >
                          {coRidersList.length === 0 ? (
                            <option value="">No other active employees found</option>
                          ) : (
                            coRidersList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} (+91 {u.mobile})
                              </option>
                            ))
                          )}
                        </select>
                        <p className="text-[10px] text-indigo-700 mt-1">
                          Distance will be split 50/50. Co-rider will receive a confirmation on their dashboard.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                          Fuel Expense Split (if refilled during ride)
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "SPLIT_EQUALLY", label: "⚖️ Split 50/50" },
                            { id: "PAID_BY_PRIMARY", label: "👤 You Pay" },
                            { id: "PAID_BY_CO_RIDER", label: "👥 Co-Rider Pays" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setFuelSplitType(opt.id)}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                                fuelSplitType === opt.id
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-slate-600 border-indigo-200 hover:bg-indigo-100/50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Tip: Verify with your speedometer. You can tap the number to adjust any digit before continuing.
                </p>
              </div>

              {/* Quick Action Buttons for the Reading */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartBike}
                  disabled={!isValidKm || startingRide}
                  className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm shadow-lg hover:shadow-xl transition flex items-center justify-between cursor-pointer disabled:cursor-not-allowed group"
                >
                  <div className="text-left">
                    <span className="block font-black text-sm">
                      {startingRide ? "Checking out bike..." : "🚴 Start Bike & Begin Ride"}
                    </span>
                    <span className="text-[11px] text-emerald-100 font-medium block">
                      Locks bike &bull; Prompts for stop reading when done
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </button>

                <div className="flex items-center justify-between pt-1 text-[11px] px-1">
                  <span className="text-slate-400">Already completed your ride?</span>
                  <button
                    type="button"
                    onClick={handleStartTrip}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Log full trip manually &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">BikeTrack Quick Scanner</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 transition font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
