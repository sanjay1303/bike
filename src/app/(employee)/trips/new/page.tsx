"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Bike,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Calendar,
  Tag,
  FileText,
  Fuel,
  Sparkles,
  IndianRupee,
  Check,
  X,
  Upload,
  Camera,
  FileCheck,
  Lock,
  Users,
  User,
} from "lucide-react";
import { Header } from "@/components/common/Header";
import { BottomNav } from "@/components/common/BottomNav";
import { useToast } from "@/components/common/Toast";
import { bikeApi, tripsApi } from "@/api";
import { Bike as BikeType, ActiveRiderInfo } from "@/types";
import { BikeInUseModal } from "@/components/dashboard/BikeInUseModal";

const SUGGESTED_PURPOSES = [
  "Client Visit",
  "Site Visit",
  "Office Work",
  "Bank",
  "Meeting",
  "Market",
  "Delivery",
  "Personal/Other",
];

function AddTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const queryStartKm = searchParams.get("startKm");
  const queryEndKm = searchParams.get("endKm");
  const queryIsDouble = searchParams.get("isDouble") === "true";
  const queryCoRider = searchParams.get("coRider") || "";
  const queryFuelSplit = searchParams.get("fuelSplit") || "SPLIT_EQUALLY";

  const [bike, setBike] = useState<BikeType | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startingKm, setStartingKm] = useState<string>(queryStartKm || "");
  const [endingKm, setEndingKm] = useState<string>(queryEndKm || "");
  const [purpose, setPurpose] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Double ride state
  const [isDoubleRide, setIsDoubleRide] = useState<boolean>(queryIsDouble);
  const [coRiderId, setCoRiderId] = useState<string>(queryCoRider);
  const [fuelSplitType, setFuelSplitType] = useState<string>(queryFuelSplit);
  const [coRidersList, setCoRidersList] = useState<Array<{ id: string; name: string; mobile: string }>>([]);
  const [loadingCoRiders, setLoadingCoRiders] = useState<boolean>(false);

  // In-use concurrency lock modal
  const [showBikeInUseModal, setShowBikeInUseModal] = useState<boolean>(false);
  const [inUseRider, setInUseRider] = useState<ActiveRiderInfo | null>(null);

  // Fuel Entry Option (True / False)
  const [hasFuelEntry, setHasFuelEntry] = useState<boolean>(false);
  const [fuelAmount, setFuelAmount] = useState<string>("");
  const [fuelLitres, setFuelLitres] = useState<string>("");
  const [fuelPrice, setFuelPrice] = useState<string>("113");
  const [fuelRemarks, setFuelRemarks] = useState<string>("");
  const [fuelBillFile, setFuelBillFile] = useState<File | null>(null);
  const [fuelBillUrl, setFuelBillUrl] = useState<string | null>(null);
  const [fuelPreviewUrl, setFuelPreviewUrl] = useState<string | null>(null);
  const [uploadingFuelBill, setUploadingFuelBill] = useState<boolean>(false);

  // Load team members for co-rider selection
  useEffect(() => {
    async function loadCoRiders() {
      try {
        setLoadingCoRiders(true);
        const data = await tripsApi.getCoRiders();
        setCoRidersList(data.coRiders || []);
      } catch (err) {
        console.error("Failed to load co-riders:", err);
      } finally {
        setLoadingCoRiders(false);
      }
    }
    loadCoRiders();
  }, []);

  // Fetch current bike odometer and verify bike availability
  useEffect(() => {
    async function loadBike() {
      try {
        const [data, liveData] = await Promise.all([
          bikeApi.getBike(),
          tripsApi.getLiveBikeStatus().catch(() => null),
        ]);

        if (data.bike) {
          setBike(data.bike);
          if (!queryStartKm) {
            setStartingKm(data.bike.currentKm.toString());
          }
          if (data.bike.fuelPrice) {
            setFuelPrice(data.bike.fuelPrice.toString());
          }
        }

        if (liveData?.status?.inUse && liveData.status.currentRider) {
          setInUseRider(liveData.status.currentRider);
          setShowBikeInUseModal(true);
        }
      } catch (err) {
        console.error("Failed to load bike odometer:", err);
      }
    }
    loadBike();
  }, [queryStartKm]);

  const numStart = parseInt(startingKm, 10) || 0;
  const numEnd = parseInt(endingKm, 10) || 0;
  const calculatedDistance = numEnd >= numStart ? numEnd - numStart : 0;
  const isNegative = startingKm !== "" && endingKm !== "" && numEnd < numStart;
  const isLowerThanBikeOdo = bike && numStart < bike.currentKm;

  // Auto-calculate litres when amount changes
  const handleAmountChange = (val: string) => {
    setFuelAmount(val);
    const amt = parseFloat(val);
    const price = parseFloat(fuelPrice) || 113;
    if (!isNaN(amt) && amt > 0 && price > 0) {
      setFuelLitres((amt / price).toFixed(2));
    } else if (!val) {
      setFuelLitres("");
    }
  };

  // Upload Fuel Bill Receipt photo
  const handleFuelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5 MB limit. Please select a smaller photo.");
        return;
      }
      setFuelBillFile(file);
      if (file.type.startsWith("image/")) {
        setFuelPreviewUrl(URL.createObjectURL(file));
      } else {
        setFuelPreviewUrl(null);
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
          toast.success("Receipt proof attached!");
        } else {
          toast.error(json.error || "Failed to upload receipt proof.");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to upload receipt proof.");
      } finally {
        setUploadingFuelBill(false);
      }
    }
  };

  const removeFuelFile = () => {
    setFuelBillFile(null);
    setFuelBillUrl(null);
    if (fuelPreviewUrl && fuelPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fuelPreviewUrl);
    }
    setFuelPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!startingKm || isNaN(numStart) || numStart < 0) {
      setErrorMsg("Please enter a valid Starting KM.");
      return;
    }

    if (!endingKm || isNaN(numEnd) || numEnd < 0) {
      setErrorMsg("Please enter a valid Ending KM.");
      return;
    }

    if (numEnd < numStart) {
      setErrorMsg("Ending KM cannot be less than Starting KM.");
      return;
    }

    if (!purpose || !purpose.trim()) {
      setErrorMsg("Trip Purpose is mandatory. Please enter the purpose of your trip.");
      toast.error("Trip Purpose is mandatory.");
      return;
    }

    // Validate Co-Rider for Double Rides
    if (isDoubleRide && !coRiderId) {
      setErrorMsg("Please select the second user (co-rider) for this double ride.");
      toast.error("Please select a co-rider.");
      return;
    }

    // Validate Fuel Entry if set to true
    if (hasFuelEntry) {
      const numAmount = parseFloat(fuelAmount);
      const numLitres = parseFloat(fuelLitres);

      if (isNaN(numAmount) || numAmount <= 0) {
        setErrorMsg("Please enter the fuel amount in Rupees (₹) since Fuel Entry is True.");
        return;
      }
      if (isNaN(numLitres) || numLitres <= 0) {
        setErrorMsg("Please enter fuel quantity in litres (L).");
        return;
      }
      if (!fuelBillUrl) {
        setErrorMsg("Uploading petrol bill receipt proof is mandatory when logging a fuel refill. Please upload bill photo.");
        toast.error("Receipt proof is mandatory for fuel refill.");
        return;
      }
    }

    try {
      setLoading(true);

      const payload: any = {
        date,
        startingKm: numStart,
        endingKm: numEnd,
        purpose: purpose.trim(),
        remarks,
        hasFuelEntry,
        isDoubleRide,
        coRiderId: isDoubleRide ? coRiderId : undefined,
        fuelSplitType: isDoubleRide && hasFuelEntry ? fuelSplitType : "NONE",
      };

      if (hasFuelEntry) {
        payload.fuel = {
          amount: parseFloat(fuelAmount),
          litres: parseFloat(fuelLitres),
          pricePerLitre: parseFloat(fuelPrice) || 113,
          billImageUrl: fuelBillUrl,
          remarks: fuelRemarks || `Refilled on ${purpose} trip (${calculatedDistance} km)`,
          fuelSplitType: isDoubleRide ? fuelSplitType : "NONE",
        };
      }

      await tripsApi.createTrip(payload);

      toast.success(
        hasFuelEntry
          ? "Trip and Fuel Entry recorded successfully!"
          : "Trip saved successfully."
      );
      router.push("/dashboard");
    } catch (err: any) {
      if (err.inUse || err.currentRider) {
        setInUseRider(err.currentRider);
        setShowBikeInUseModal(true);
      }
      setErrorMsg(err.message || "Failed to save trip.");
      toast.error(err.message || "Failed to save trip.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl w-full mx-auto">
      {/* Navigation Breadcrumb */}
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Add New Trip</h1>
            <p className="text-xs text-slate-500">Record your journey and optional fuel refill on the company bike</p>
          </div>
        </div>

        {bike && (
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600">Company Bike: <strong className="text-slate-900">{bike.name} ({bike.registrationNumber})</strong></span>
            <span className="text-emerald-700 font-semibold font-mono">Current Odo: {bike.currentKm.toLocaleString("en-IN")} km</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {isLowerThanBikeOdo && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Note: Starting KM ({numStart}) is lower than the bike&apos;s latest recorded odometer ({bike?.currentKm} km). Make sure this is intended.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Field */}
          <div>
            <label htmlFor="tripDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date
            </label>
            <input
              id="tripDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
              required
            />
          </div>

          {/* Ride Type Selection (Solo vs Double Ride) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  isDoubleRide ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Ride Type
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Solo ride or 2 persons sharing the bike (Doubles)
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDoubleRide(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !isDoubleRide
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Solo (1 Person)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDoubleRide(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isDoubleRide
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-indigo-700"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Double (2 Persons)</span>
                </button>
              </div>
            </div>

            {/* When Double Ride is selected */}
            {isDoubleRide && (
              <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-in fade-in">
                <div>
                  <label htmlFor="coRiderSelect" className="block text-[11px] font-bold text-slate-800 mb-1">
                    Select Second User (Co-Rider) *
                  </label>
                  <select
                    id="coRiderSelect"
                    value={coRiderId}
                    onChange={(e) => setCoRiderId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-300 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-300 shadow-2xs"
                    required={isDoubleRide}
                  >
                    <option value="">-- Choose Team Member --</option>
                    {loadingCoRiders ? (
                      <option disabled>Loading team members...</option>
                    ) : (
                      coRidersList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.mobile})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {calculatedDistance > 0 && (
                  <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950">
                    <span className="font-medium">KM Split (50% each):</span>
                    <span className="font-bold font-mono">
                      You: {Math.round(calculatedDistance / 2)} km &bull; Co-rider: {calculatedDistance - Math.round(calculatedDistance / 2)} km
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-indigo-700">
                  Note: A confirmation card will appear on the co-rider&apos;s dashboard to accept or decline their share.
                </p>
              </div>
            )}
          </div>

          {/* Starting KM & Ending KM Row (Clean Old Version Manual Number Inputs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startKm" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Starting KM
              </label>
              <input
                id="startKm"
                type="number"
                min="0"
                value={startingKm}
                onChange={(e) => setStartingKm(e.target.value)}
                placeholder="e.g. 7496"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
                required
              />
            </div>

            <div>
              <label htmlFor="endKm" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                Ending KM
              </label>
              <input
                id="endKm"
                type="number"
                min="0"
                value={endingKm}
                onChange={(e) => setEndingKm(e.target.value)}
                placeholder="e.g. 7520"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Automatically Calculated Total Distance Banner */}
          <div
            className={`p-4 rounded-2xl border transition ${
              isNegative
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Total Distance
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Formula: Ending KM &minus; Starting KM</p>
              </div>
              <div className="text-right">
                {isNegative ? (
                  <span className="text-sm font-bold text-rose-600">Ending &lt; Starting</span>
                ) : (
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {calculatedDistance} km
                  </span>
                )}
              </div>
            </div>

            {!isNegative && calculatedDistance > 0 && isDoubleRide && (
              <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">
                  👥 50/50 Double Ride Split:
                </span>
                <span className="font-bold font-mono text-emerald-900">
                  Your Share: {Math.round(calculatedDistance / 2)} km &bull; Co-rider: {calculatedDistance - Math.round(calculatedDistance / 2)} km
                </span>
              </div>
            )}
          </div>

          {/* Purpose Input (Mandatory with quick suggestion chips) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="purpose" className="block text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Purpose *
              </label>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                Mandatory
              </span>
            </div>
            <input
              id="purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter trip purpose (e.g. Client Visit, Site Inspection, Bank Work...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
              required
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-[10px] text-slate-400 font-medium">Quick suggestions:</span>
              {SUGGESTED_PURPOSES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setPurpose(tag)}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-600 transition cursor-pointer text-[11px] font-medium"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Remarks (Optional)
            </label>
            <textarea
              id="remarks"
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Client name, location, or notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs"
            />
          </div>

          {/* ============================================================= */}
          {/* FUEL ENTRY OPTION (TRUE / FALSE TOGGLE)                       */}
          {/* ============================================================= */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                  hasFuelEntry
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}>
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Refilled Fuel on this Trip?
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Option: Select <strong>True</strong> to log petrol refill together with this trip
                  </p>
                </div>
              </div>

              {/* True / False Segmented Buttons */}
              <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setHasFuelEntry(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    !hasFuelEntry
                      ? "bg-slate-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {!hasFuelEntry && <Check className="w-3.5 h-3.5" />}
                  <span>False (No)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasFuelEntry(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    hasFuelEntry
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  {hasFuelEntry && <Check className="w-3.5 h-3.5" />}
                  <span>True (Yes)</span>
                </button>
              </div>
            </div>

            {/* Expandable Fuel Details Form when hasFuelEntry === true */}
            {hasFuelEntry && (
              <div className="mt-3 p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 space-y-4 animate-in fade-in-50 zoom-in-98 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Fuel Refill Details
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    Linked to Trip
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Amount in Rupees */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-emerald-600" />
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={fuelAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="250"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                      required={hasFuelEntry}
                    />
                  </div>

                  {/* Quantity in Litres (Non-editable, auto-calculated) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-emerald-600" />
                        Quantity (Litres)
                      </label>
                      <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        Non-Editable
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={fuelLitres || "0.00"}
                        readOnly
                        disabled
                        tabIndex={-1}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-600 cursor-not-allowed select-none focus:outline-hidden"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Auto-calculated from Amount
                    </p>
                  </div>

                  {/* Price per Litre (Non-editable, admin-configured rate) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Price / Litre (₹)
                      </label>
                      <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        Non-Editable
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={fuelPrice || "113"}
                        readOnly
                        disabled
                        tabIndex={-1}
                        placeholder="113"
                        className="w-full px-3 py-2 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-600 cursor-not-allowed select-none focus:outline-hidden"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none">
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Admin-configured rate
                    </p>
                  </div>
                </div>

                {/* Optional Remarks for Fuel */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Petrol Pump / Fuel Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={fuelRemarks}
                    onChange={(e) => setFuelRemarks(e.target.value)}
                    placeholder="e.g. Indian Oil, Infopark Bypass"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Mandatory Bill Receipt Proof Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Upload className="w-3 h-3 text-rose-500" />
                      <span>Upload Bill Receipt Proof * (Mandatory)</span>
                    </span>
                    {fuelBillUrl && (
                      <span className="text-[10px] text-emerald-700 font-bold">✓ Attached</span>
                    )}
                  </label>

                  {!fuelBillFile ? (
                    <div className="relative border border-dashed border-rose-300 hover:border-rose-400 bg-white/70 hover:bg-white rounded-xl p-3.5 text-center transition cursor-pointer group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        onChange={handleFuelFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 text-[11px]">
                            {uploadingFuelBill ? "Uploading receipt proof..." : "Click to attach petrol bill receipt photo"}
                          </p>
                          <p className="text-[10px] text-slate-400">JPG, PNG, PDF up to 5 MB</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate text-xs">
                        {fuelPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fuelPreviewUrl}
                            alt="Receipt preview"
                            className="w-8 h-8 rounded-lg object-cover border border-emerald-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileCheck className="w-4 h-4" />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-[11px] truncate">
                            {fuelBillFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {uploadingFuelBill ? "Uploading..." : "✓ Receipt attached"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFuelFile}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Double Ride Fuel Split Options */}
                {isDoubleRide && (
                  <div className="pt-3 border-t border-emerald-200/80">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
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

                {/* Summary preview */}
                {parseFloat(fuelAmount) > 0 && parseFloat(fuelLitres) > 0 && (
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                    <span>Refilling <strong>{fuelLitres} L</strong> of Petrol</span>
                    <span>Total: <strong className="text-sm font-bold text-slate-900">₹{fuelAmount}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || isNegative || numEnd <= 0}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{hasFuelEntry ? "Save Trip & Fuel Refill" : "Save Trip"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bike In Use Warning Modal */}
      <BikeInUseModal
        isOpen={showBikeInUseModal}
        onClose={() => {
          setShowBikeInUseModal(false);
          router.push("/dashboard");
        }}
        currentRider={inUseRider}
        bikeName={bike?.name}
        registrationNumber={bike?.registrationNumber}
      />
    </main>
  );
}

export default function AddTripPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Header userRole="EMPLOYEE" />
      <Suspense fallback={<div className="p-12 text-center text-slate-500 font-semibold">Loading trip form...</div>}>
        <AddTripContent />
      </Suspense>
      <BottomNav />
    </div>
  );
}
