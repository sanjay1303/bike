"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Fuel, Calculator, ArrowRight, RotateCcw, Sparkles, IndianRupee, Gauge } from "lucide-react";
import { calculatePetrolExpense } from "@/lib/calculations";

interface PetrolCalculatorProps {
  initialDistance?: number;
  initialMileage?: number;
  initialPrice?: number;
  className?: string;
}

export function PetrolCalculator({
  initialDistance = 30,
  initialMileage = 30,
  initialPrice = 113,
  className = "",
}: PetrolCalculatorProps) {
  const [distance, setDistance] = useState<number>(initialDistance);
  const [mileage, setMileage] = useState<number>(initialMileage);
  const [petrolPrice, setPetrolPrice] = useState<number>(initialPrice);

  // Quick preset distances
  const presetDistances = [10, 30, 50, 75, 100];

  // Calculated values
  const result = useMemo(() => {
    const validDist = Math.max(0, Number(distance) || 0);
    const validMileage = Math.max(0.1, Number(mileage) || 30);
    const validPrice = Math.max(0, Number(petrolPrice) || 113);

    return calculatePetrolExpense(validDist, validMileage, validPrice);
  }, [distance, mileage, petrolPrice]);

  const handleReset = () => {
    setDistance(30);
    setMileage(30);
    setPetrolPrice(113);
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
            <Calculator className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Petrol Expense Calculator
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Live Calc
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Estimate fuel requirement and travel cost instantly
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          title="Reset to defaults (30km, 30km/L, ₹113)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
        {/* Planned Distance */}
        <div className="space-y-1.5">
          <label className="block text-slate-600 font-medium">
            Trip Distance
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="1"
              max="2000"
              value={distance || ""}
              onChange={(e) => setDistance(Math.max(0, Number(e.target.value)))}
              placeholder="30"
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden font-bold text-slate-900 text-sm"
            />
            <span className="absolute right-3 text-xs text-slate-400 font-semibold select-none pointer-events-none">
              km
            </span>
          </div>

          {/* Quick distance presets */}
          <div className="flex flex-wrap gap-1 pt-1">
            {presetDistances.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => setDistance(km)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                  distance === km
                    ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {km}k
              </button>
            ))}
          </div>
        </div>

        {/* Bike Mileage (km/L) */}
        <div className="space-y-1.5">
          <label className="block text-slate-600 font-medium">
            Mileage (km / Litre)
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="1"
              max="150"
              value={mileage || ""}
              onChange={(e) => setMileage(Math.max(1, Number(e.target.value)))}
              placeholder="30"
              className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden font-bold text-slate-900 text-sm"
            />
            <span className="absolute right-3 text-xs text-slate-400 font-semibold select-none pointer-events-none">
              km/L
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Default: 30 km per 1 Litre
          </p>
        </div>

        {/* Petrol Price (₹/L) */}
        <div className="space-y-1.5">
          <label className="block text-slate-600 font-medium">
            Petrol Price (₹ / L)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs text-slate-400 font-semibold select-none pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              min="1"
              max="300"
              value={petrolPrice || ""}
              onChange={(e) => setPetrolPrice(Math.max(0, Number(e.target.value)))}
              placeholder="113"
              className="w-full pl-7 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden font-bold text-slate-900 text-sm"
            />
            <span className="absolute right-3 text-xs text-slate-400 font-semibold select-none pointer-events-none">
              /L
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Current Rate: ₹113 / Litre
          </p>
        </div>
      </div>

      {/* Calculated Results Banner */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
            Total Estimated Fuel Expense
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
              ₹{result.totalCost.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              for {distance} km
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80 mt-1 font-mono">
            {distance} km &divide; {mileage} km/L &times; ₹{petrolPrice}/L
          </p>
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-center shrink-0">
          {/* Fuel Required */}
          <div className="bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold mb-0.5">
              <Fuel className="w-3 h-3 text-emerald-600" />
              <span>Fuel Needed</span>
            </div>
            <p className="text-sm font-black text-slate-900">
              {result.litresNeeded} L
            </p>
          </div>

          {/* Running Cost per KM */}
          <div className="bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold mb-0.5">
              <Gauge className="w-3 h-3 text-emerald-600" />
              <span>Cost per km</span>
            </div>
            <p className="text-sm font-black text-slate-900">
              ₹{result.costPerKm.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Link to Pre-fill Fuel Entry */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-500">
          Want to log this fuel purchase?
        </span>
        <Link
          href={`/fuel/new?litres=${result.litresNeeded}&amount=${result.totalCost}&price=${petrolPrice}`}
          className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          <span>Claim Fuel Reimbursement</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
