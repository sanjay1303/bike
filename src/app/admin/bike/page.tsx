"use client";

import React, { useState, useEffect } from "react";
import { Wrench, Bike, CheckCircle2, AlertTriangle, Gauge, Fuel, Shield, Tag, IndianRupee } from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { bikeApi } from "@/api";
import { Bike as BikeType } from "@/types";

export default function AdminBikePage() {
  const toast = useToast();

  const [bike, setBike] = useState<BikeType | null>(null);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [currentKm, setCurrentKm] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [mileageTarget, setMileageTarget] = useState("45");
  const [fuelPrice, setFuelPrice] = useState("113");
  const [status, setStatus] = useState("AVAILABLE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadBike() {
      try {
        const data = await bikeApi.getBike();
        if (data.bike) {
          setBike(data.bike);
          setName(data.bike.name);
          setRegistrationNumber(data.bike.registrationNumber);
          setCurrentKm(data.bike.currentKm.toString());
          setFuelType(data.bike.fuelType);
          setMileageTarget(data.bike.mileageTarget.toString());
          if (data.bike.fuelPrice) {
            setFuelPrice(data.bike.fuelPrice.toString());
          }
          setStatus(data.bike.status);
        }
      } catch (err) {
        console.error("Failed to load bike:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBike();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const numKm = parseInt(currentKm, 10);
    if (bike && numKm < bike.currentKm) {
      setErrorMsg(`Current KM cannot decrease. The odometer is currently at ${bike.currentKm} km.`);
      return;
    }

    const numFuelPrice = parseFloat(fuelPrice);
    if (isNaN(numFuelPrice) || numFuelPrice <= 0) {
      setErrorMsg("Please enter a valid current petrol rate (₹/L).");
      return;
    }

    try {
      setSaving(true);
      const data = await bikeApi.updateBike({
        name,
        registrationNumber,
        currentKm: numKm,
        fuelType,
        mileageTarget: parseFloat(mileageTarget) || 45,
        fuelPrice: numFuelPrice,
        status: status as any,
      });

      toast.success("Bike details updated successfully.");
      setBike(data.bike);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update bike.");
      toast.error(err.message || "Failed to update bike.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading bike configurations...</div>;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Wrench className="w-6 h-6 text-emerald-600" />
          Company Bike Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure vehicle specifications, odometer baseline, and availability status
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
        {/* Top Summary Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{bike?.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-200 text-emerald-900">
                {bike?.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              Reg: {bike?.registrationNumber} &bull; Odometer: {bike?.currentKm.toLocaleString("en-IN")} km
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bikeName" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Bike Name / Model
              </label>
              <input
                id="bikeName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Company Bike"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label htmlFor="bikeReg" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Registration Number
              </label>
              <input
                id="bikeReg"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="KL 07 AB 1234"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:outline-hidden uppercase"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="bikeKm" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Current Odometer (KM)
              </label>
              <input
                id="bikeKm"
                type="number"
                min={bike?.currentKm || 0}
                value={currentKm}
                onChange={(e) => setCurrentKm(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:outline-hidden"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Rule 10: Odometer cannot decrease.</p>
            </div>

            <div>
              <label htmlFor="bikeFuel" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-slate-400" />
                Fuel Type
              </label>
              <input
                id="bikeFuel"
                type="text"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label htmlFor="bikeMileage" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                Target Mileage (km/L)
              </label>
              <input
                id="bikeMileage"
                type="number"
                step="0.5"
                value={mileageTarget}
                onChange={(e) => setMileageTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-medium focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label htmlFor="bikeFuelPrice" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                Current Petrol Rate (₹/L)
              </label>
              <input
                id="bikeFuelPrice"
                type="number"
                step="0.1"
                min="1"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                placeholder="113"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/30 text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                required
              />
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">Admin Only: Auto-fills employee fuel entry litres.</p>
            </div>
          </div>

          <div>
            <label htmlFor="bikeStatus" className="block font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Availability Status
            </label>
            <select
              id="bikeStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <span>Saving updates...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Bike Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
