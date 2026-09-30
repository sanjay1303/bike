"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Fuel,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Gauge,
  IndianRupee,
  FileText,
  Upload,
  Sparkles,
  Camera,
  X,
  AlertCircle,
  FileCheck,
  Lock,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { bikeApi, fuelApi } from "@/api";
import { Bike as BikeType } from "@/types";

export default function AddFuelPage() {
  const router = useRouter();
  const toast = useToast();

  const [bike, setBike] = useState<BikeType | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [currentKm, setCurrentKm] = useState<string>("");
  const [litres, setLitres] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [mileageInfo, setMileageInfo] = useState<{ mileage: number | null; canCalculate: boolean }>({
    mileage: null,
    canCalculate: false,
  });

  const petrolRate = bike?.fuelPrice || 113;

  useEffect(() => {
    async function loadData() {
      try {
        const [bData, fData] = await Promise.all([
          bikeApi.getBike(),
          fuelApi.getFuelEntries({ limit: 1 }),
        ]);

        if (bData.bike) {
          setBike(bData.bike);
          setCurrentKm(bData.bike.currentKm.toString());
        }

        if (fData.mileageStats) {
          setMileageInfo({
            mileage: fData.mileageStats.mileage,
            canCalculate: fData.mileageStats.canCalculate,
          });
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qLitres = params.get("litres");
      const qAmount = params.get("amount");
      if (qAmount) {
        setAmount(qAmount);
        const a = parseFloat(qAmount);
        if (a > 0) setLitres((a / petrolRate).toFixed(2));
      } else if (qLitres) {
        setLitres(qLitres);
      }
    }
  }, [petrolRate]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Auto-fill Litres based on Amount & Current Petrol Rate
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val);
    if (!isNaN(amt) && amt > 0 && petrolRate > 0) {
      setLitres((amt / petrolRate).toFixed(2));
    } else if (!val) {
      setLitres("");
    }
  };

  // Adjust Amount based on Litres & Current Petrol Rate
  const handleLitresChange = (val: string) => {
    setLitres(val);
    const l = parseFloat(val);
    if (!isNaN(l) && l > 0 && petrolRate > 0) {
      setAmount(Math.round(l * petrolRate).toString());
    } else if (!val) {
      setAmount("");
    }
  };

  const numLitres = parseFloat(litres) || 0;
  const numAmount = parseFloat(amount) || 0;
  const calculatedPricePerLitre = numLitres > 0 && numAmount > 0 ? (numAmount / numLitres).toFixed(2) : petrolRate.toFixed(2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5 MB. Please select a smaller photo or document.");
        return;
      }

      setBillFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setErrorMsg("");
    }
  };

  const removeFile = () => {
    setBillFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const numKm = parseInt(currentKm, 10);
    if (isNaN(numKm) || numKm <= 0) {
      setErrorMsg("Please enter a valid Current KM.");
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg("Please enter a valid fuel amount in Rupees.");
      return;
    }
    if (numLitres <= 0) {
      setErrorMsg("Please enter a valid fuel quantity in litres.");
      return;
    }

    // MANDATORY PROOF VALIDATION
    if (!billFile) {
      setErrorMsg("Uploading petrol bill receipt proof is mandatory. Please attach a photo or PDF.");
      toast.error("Petrol bill receipt proof is mandatory.");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("date", date);
      formData.append("currentKm", numKm.toString());
      formData.append("litres", numLitres.toString());
      formData.append("amount", numAmount.toString());
      if (remarks) formData.append("remarks", remarks);
      formData.append("billFile", billFile);

      await fuelApi.createFuelEntry(formData);

      toast.success("Fuel entry & bill proof uploaded successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save fuel entry.");
      toast.error(err.message || "Failed to save fuel entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl w-full mx-auto">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Add Fuel Entry</h1>
              <p className="text-xs text-slate-500">Record petrol refill, auto-calculate litres, and upload bill proof</p>
            </div>
          </div>

          {/* Current Petrol Rate Banner (Configured by Admin) */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Current Petrol Rate
                  </span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                    Admin Set
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Type your Amount (₹), and Litres will auto-fill automatically.
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-amber-200 sm:pl-4">
              <div className="text-xl font-black text-slate-900 font-mono">
                ₹{petrolRate} <span className="text-xs font-semibold text-slate-500">/ Litre</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold">⚡ Live Rate</p>
            </div>
          </div>

          {bike && (
            <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600">Company Bike: <strong className="text-slate-900">{bike.name} ({bike.registrationNumber})</strong></span>
              <span className="text-slate-700 font-mono">Current Odo: {bike.currentKm.toLocaleString("en-IN")} km</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date Field */}
            <div>
              <label htmlFor="fuelDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                id="fuelDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
                required
              />
            </div>

            {/* Current KM */}
            <div>
              <label htmlFor="currentKm" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Current Odometer KM
              </label>
              <input
                id="currentKm"
                type="number"
                min="0"
                value={currentKm}
                onChange={(e) => setCurrentKm(e.target.value)}
                placeholder="12500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
                required
              />
            </div>

            {/* Amount & Litres Row (With Auto-Fill) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount in ₹ (User Types here) */}
              <div>
                <label htmlFor="amount" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  Amount Paid (₹) *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  min="1"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/20 text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden shadow-2xs"
                  required
                />
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  Type amount &rarr; Litres auto-fills instantly.
                </p>
              </div>

              {/* Quantity in Litres (Auto-calculated, Non-editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="litres" className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-600" />
                    Quantity (Litres)
                  </label>
                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    Auto-Calculated (Non-Editable)
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="litres"
                    type="number"
                    step="0.01"
                    value={litres}
                    readOnly
                    tabIndex={-1}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100/90 text-sm font-mono font-bold text-slate-700 cursor-not-allowed select-none shadow-2xs focus:outline-hidden"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-400 font-semibold pointer-events-none select-none">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Locked</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Auto-calculated: ₹{numAmount || 0} &divide; ₹{petrolRate}/L = <strong className="text-slate-700">{numLitres || 0} L</strong> (Fixed petrol rate)
                </p>
              </div>
            </div>

            {/* Live Price Per Litre & Estimated Mileage Banner */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider block text-amber-900">
                    Effective Price per Litre
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">Rate: ₹{petrolRate}/L (Standard)</p>
                </div>
                <div className="text-xl font-extrabold text-amber-900 font-mono">
                  ₹{calculatedPricePerLitre} / L
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-amber-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Bike Mileage Target:
                </span>
                <span className="font-semibold text-amber-900">
                  {bike?.mileageTarget || 30} km / Litre
                </span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* MANDATORY PETROL BILL RECEIPT PROOF UPLOAD                    */}
            {/* ============================================================= */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="billPhoto"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-500" />
                  <span>Upload Bill Receipt Proof</span>
                  <span className="text-rose-600">* (Mandatory)</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Required by Company
                </span>
              </div>

              {/* Upload Dropzone / Picker */}
              {!billFile ? (
                <div className="relative border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/30 hover:bg-rose-50/50 rounded-2xl p-6 text-center transition cursor-pointer group">
                  <input
                    id="billPhoto"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to capture or upload fuel bill photo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        JPG, PNG, WEBP, or PDF up to 5 MB
                      </p>
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded">
                      Receipt is strictly required to claim petrol expense
                    </span>
                  </div>
                </div>
              ) : (
                /* Selected File Preview Box */
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3 truncate">
                    {previewUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-300 shrink-0 relative bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Bill preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-bold text-emerald-900 truncate">
                          {billFile.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                        {(billFile.size / 1024).toFixed(0)} KB &bull; Proof attached successfully
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label htmlFor="remarks" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Remarks / Pump Name (Optional)
              </label>
              <textarea
                id="remarks"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g., HP Petrol Pump, MG Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || numLitres <= 0 || numAmount <= 0 || !billFile}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Saving & Uploading Proof...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Fuel Entry</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
  );
}
