"use client";

import React, { useState } from "react";
import {
  Camera,
  Upload,
  CheckCircle2,
  Gauge,
  X,
  Fuel,
  IndianRupee,
  Lock,
  Sparkles,
  FileCheck,
  Check,
  RotateCcw,
  Flag,
  Users,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { tripsApi } from "@/api";
import { Trip, Bike as BikeType } from "@/types";

interface EndRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: Trip | null;
  bike: BikeType | null;
  onTripCompleted: () => void;
}

/**
 * Client-side photo optimizer to ensure fast uploads on mobile networks
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

      if (!ctx) return resolve({ blob: file, fileName: file.name });

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

export function EndRideModal({
  isOpen,
  onClose,
  activeTrip,
  bike,
  onTripCompleted,
}: EndRideModalProps) {
  const toast = useToast();

  const [endingKm, setEndingKm] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [analyzingOcr, setAnalyzingOcr] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fuel Refill Option
  const [hasFuelEntry, setHasFuelEntry] = useState(false);
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelLitres, setFuelLitres] = useState("");
  const [fuelPrice] = useState((bike as any)?.fuelPrice?.toString() || "113");
  const [fuelRemarks, setFuelRemarks] = useState("");
  const [fuelBillFile, setFuelBillFile] = useState<File | null>(null);
  const [fuelBillUrl, setFuelBillUrl] = useState<string | null>(null);
  const [fuelBillPreview, setFuelBillPreview] = useState<string | null>(null);
  const [uploadingFuelBill, setUploadingFuelBill] = useState(false);
  const [fuelSplitType, setFuelSplitType] = useState<string>(
    activeTrip?.fuelSplitType || "SPLIT_EQUALLY"
  );

  if (!isOpen || !activeTrip) return null;

  const startKm = activeTrip.startingKm;
  const numEnd = Math.round(parseFloat(endingKm) * 10) / 10 || 0;
  const distanceKm = numEnd > startKm ? Number((numEnd - startKm).toFixed(2)) : 0;
  const isInvalidDistance = endingKm !== "" && numEnd <= startKm;

  // Handle Photo selection for stopping point odometer
  const handlePhotoSelected = async (file: File) => {
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setAnalyzingOcr(true);

    try {
      const { blob, fileName } = await optimizeImageForUpload(file);
      const formData = new FormData();
      formData.append("photo", blob, fileName);

      const res = await fetch("/api/ocr/odometer", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to analyze photo");

      setUploadedPhotoUrl(data.photoUrl);
      if (data.success && typeof data.reading === "number") {
        setEndingKm(data.reading.toString());
        setOcrConfidence(data.confidence ?? 0.85);
        toast.success(`Detected Stop Reading: ${data.reading.toLocaleString("en-IN")} km`);
      } else {
        toast.error("Could not read digits clearly. Please enter the number manually.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process photo");
    } finally {
      setAnalyzingOcr(false);
    }
  };

  const handleFuelAmountChange = (val: string) => {
    setFuelAmount(val);
    const amt = parseFloat(val);
    const price = parseFloat(fuelPrice) || 113;
    if (!isNaN(amt) && amt > 0 && price > 0) {
      setFuelLitres((amt / price).toFixed(2));
    } else if (!val) {
      setFuelLitres("");
    }
  };

  const handleFuelBillFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFuelBillFile(file);
      if (file.type.startsWith("image/")) {
        setFuelBillPreview(URL.createObjectURL(file));
      }

      try {
        setUploadingFuelBill(true);
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.fileUrl) {
          setFuelBillUrl(json.fileUrl);
          toast.success("Receipt photo attached!");
        } else {
          toast.error(json.error || "Failed to upload receipt");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to upload receipt");
      } finally {
        setUploadingFuelBill(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!endingKm || isNaN(numEnd) || numEnd < 0) {
      toast.error("Please enter a valid Ending KM reading.");
      return;
    }

    if (numEnd <= startKm) {
      toast.error(
        numEnd === startKm
          ? `Ending KM cannot be the same as Starting KM (${startKm} km).`
          : `Ending KM (${numEnd} km) cannot be less than Starting KM (${startKm} km).`
      );
      return;
    }

    if (hasFuelEntry) {
      const amt = parseFloat(fuelAmount);
      const ltr = parseFloat(fuelLitres);
      if (isNaN(amt) || amt <= 0 || isNaN(ltr) || ltr <= 0) {
        toast.error("Please enter valid fuel refill details.");
        return;
      }
      if (!fuelBillUrl) {
        toast.error("Petrol bill receipt photo is mandatory when logging fuel refill.");
        return;
      }
    }

    try {
      setSubmitting(true);
      await tripsApi.endTrip({
        tripId: activeTrip.id,
        endingKm: numEnd,
        remarks: remarks || activeTrip.remarks || undefined,
        endOdometerPhoto: uploadedPhotoUrl,
        endReadingMethod: uploadedPhotoUrl ? "PHOTO" : "MANUAL",
        endOcrConfidence: ocrConfidence,
        hasFuelEntry,
        fuel: hasFuelEntry
          ? {
              amount: parseFloat(fuelAmount),
              litres: parseFloat(fuelLitres),
              pricePerLitre: parseFloat(fuelPrice) || 113,
              billImageUrl: fuelBillUrl,
              remarks: fuelRemarks || undefined,
              fuelSplitType: activeTrip.isDoubleRide ? fuelSplitType : "NONE",
            }
          : undefined,
      });

      toast.success(
        `Ride completed! Total journey: ${distanceKm} km. Bike is now available.`
      );
      onClose();
      onTripCompleted();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete ride");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Flag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">End Bike Ride &amp; Add Stop Reading</h2>
              <p className="text-xs text-emerald-100 font-medium">
                {activeTrip.purpose} &bull; Company Bike {bike?.registrationNumber || "Dio 125"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Starting KM Reference Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Ride Starting Point Odometer:</span>
              <strong className="text-slate-900 font-mono text-sm">{startKm.toLocaleString("en-IN")} km</strong>
            </div>
            {activeTrip.startOdometerPhoto && (
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeTrip.startOdometerPhoto}
                  alt="Start odo preview"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-300"
                />
                <span className="text-[10px] text-emerald-700 font-bold">Start Photo</span>
              </div>
            )}
          </div>

          {/* Photo Capture for Stopping Point Odometer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span>Photo of Stopping Point Odometer (Camera / Upload)</span>
              {ocrConfidence !== null && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  ✓ AI Scanned ({Math.round(ocrConfidence * 100)}%)
                </span>
              )}
            </label>

            <input
              id="end-ride-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoSelected(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            <input
              id="end-ride-gallery"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoSelected(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />

            {!photoPreview ? (
              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor="end-ride-camera"
                  className="py-4 px-3 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span>Snap with Camera</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opens phone camera</span>
                </label>

                <label
                  htmlFor="end-ride-gallery"
                  className="py-4 px-3 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span>Upload Photo</span>
                  <span className="text-[10px] text-slate-400 font-normal">Choose from gallery</span>
                </label>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Ending odo photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {analyzingOcr ? "Scanning digits with AI..." : "Stop Odometer Photo Attached"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {analyzingOcr ? "Analyzing..." : "Ready for submission"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setUploadedPhotoUrl(null);
                    setOcrConfidence(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold text-slate-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>
            )}
          </div>

          {/* Ending KM Input */}
          <div>
            <label htmlFor="endKmInput" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              Ending KM Reading *
            </label>
            <div className="relative">
              <input
                id="endKmInput"
                type="number"
                step="any"
                min={startKm}
                value={endingKm}
                onChange={(e) => setEndingKm(e.target.value)}
                placeholder={`e.g. ${startKm + 25.5}`}
                className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-emerald-400 font-mono text-2xl font-black text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 focus:outline-hidden tracking-wider shadow-inner"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                KM
              </span>
            </div>
            {isInvalidDistance && (
              <p className="text-xs text-rose-600 mt-1 font-semibold">
                {numEnd === startKm
                  ? `Ending KM cannot be the same as Starting KM (${startKm} km). Distance must be greater than 0.`
                  : `Ending KM cannot be less than Starting KM (${startKm} km).`}
              </p>
            )}
          </div>

          {/* Live Calculated Distance */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isInvalidDistance
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  Trip Distance Covered
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formula: {numEnd || 0} km &minus; {startKm} km
                </p>
              </div>
              <div className="text-right">
                {isInvalidDistance ? (
                  <span className="text-xs font-bold text-rose-600">Ending &lt; Starting</span>
                ) : (
                  <span className="text-2xl font-black text-emerald-700">
                    {distanceKm} km
                  </span>
                )}
              </div>
            </div>

            {activeTrip.isDoubleRide && !isInvalidDistance && distanceKm > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Double Ride 50% Split:
                </span>
                <span className="font-bold">
                  {Math.round(distanceKm / 2)} km each ({activeTrip.coRider?.name || "Co-Rider"})
                </span>
              </div>
            )}
          </div>

          {/* Fuel Refill Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  hasFuelEntry ? "bg-emerald-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                }`}>
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Refilled Petrol on this ride?
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Log fuel expense together with this trip
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setHasFuelEntry(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !hasFuelEntry ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setHasFuelEntry(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    hasFuelEntry ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-emerald-700"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            {/* Fuel Details Fields if True */}
            {hasFuelEntry && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={fuelAmount}
                      onChange={(e) => handleFuelAmountChange(e.target.value)}
                      placeholder="250"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-hidden"
                      required={hasFuelEntry}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Litres (L)</label>
                    <input
                      type="text"
                      value={fuelLitres || "0.00"}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Mandatory Bill Photo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Upload Petrol Bill Receipt * (Mandatory)
                  </label>
                  {!fuelBillFile ? (
                    <label className="border border-dashed border-rose-300 hover:border-rose-400 bg-white rounded-xl p-3 text-center block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFuelBillFileChange}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-rose-600 block">
                        {uploadingFuelBill ? "Uploading..." : "+ Attach Petrol Receipt Photo"}
                      </span>
                    </label>
                  ) : (
                    <div className="p-2 rounded-xl bg-white border border-emerald-300 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 truncate">{fuelBillFile.name}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Attached</span>
                    </div>
                  )}
                </div>

                {/* Double Ride Fuel Split Options */}
                {activeTrip.isDoubleRide && (
                  <div className="pt-2.5 border-t border-emerald-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Fuel Expense Split for this Double Ride
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "SPLIT_EQUALLY", label: "⚖️ Split 50/50" },
                        { id: "PAID_BY_PRIMARY", label: "👤 You Paid (100%)" },
                        { id: "PAID_BY_CO_RIDER", label: "👥 Co-Rider Paid" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFuelSplitType(opt.id)}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition text-center cursor-pointer ${
                            fuelSplitType === opt.id
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {fuelAmount && (
                      <p className="text-[10px] text-emerald-800 font-semibold mt-1.5">
                        {fuelSplitType === "SPLIT_EQUALLY"
                          ? `Each rider pays ₹${(parseFloat(fuelAmount) / 2).toFixed(2)}`
                          : fuelSplitType === "PAID_BY_PRIMARY"
                          ? `You pay full ₹${parseFloat(fuelAmount).toFixed(2)}`
                          : `Co-rider pays full ₹${parseFloat(fuelAmount).toFixed(2)}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Trip Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Client visited, route notes, or parking location..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || isInvalidDistance || numEnd <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Finishing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Complete Ride</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
