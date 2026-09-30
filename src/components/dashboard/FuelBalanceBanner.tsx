"use client";

import React from "react";
import Link from "next/link";
import { Fuel, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { FuelBalanceSummary } from "@/types";
import { formatCurrency, formatKm } from "@/lib/calculations";

interface FuelBalanceBannerProps {
  balance?: FuelBalanceSummary;
  mileageTarget?: number;
  fuelPrice?: number;
}

export function FuelBalanceBanner({
  balance,
  mileageTarget = 30,
  fuelPrice = 113,
}: FuelBalanceBannerProps) {
  if (!balance) return null;

  const isExtra = balance.status === "EXTRA_BALANCE";
  const isPending = balance.status === "PENDING_PAYMENT";
  const isSettled = balance.status === "SETTLED";

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
        isExtra
          ? "bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border-emerald-200/90 shadow-xs"
          : isPending
          ? "bg-gradient-to-r from-rose-50/80 via-amber-50/60 to-white border-amber-200/90 shadow-xs"
          : "bg-slate-50 border-slate-200/90 shadow-xs"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Side: Status Icon & Message */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isExtra
                ? "bg-emerald-600 text-white"
                : isPending
                ? "bg-amber-500 text-white"
                : "bg-slate-600 text-white"
            }`}
          >
            {isExtra ? (
              <Sparkles className="w-6 h-6 stroke-[2.2]" />
            ) : isPending ? (
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isExtra
                    ? "bg-emerald-100 text-emerald-800"
                    : isPending
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {isExtra ? "Extra Balance" : isPending ? "Pending To Fill / Pay" : "All Settled"}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Target: {mileageTarget} km/L &bull; ₹{fuelPrice}/L
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {isExtra && (
                <span className="text-emerald-700">
                  +{formatCurrency(balance.surplusAmount)} Extra Balance
                </span>
              )}
              {isPending && (
                <span className="text-rose-600">
                  {formatCurrency(balance.pendingAmount)} To Pay / Refill
                </span>
              )}
              {isSettled && <span className="text-slate-700">₹0 Balance (Fully Settled)</span>}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl font-medium leading-relaxed">
              {isExtra &&
                `You have filled ₹${balance.actualFuelPaid} petrol for ${formatKm(
                  balance.totalDistanceKm
                )} ridden (usage: ₹${balance.expectedCost}). You have +₹${balance.surplusAmount} credit with the company.`}
              {isPending &&
                `You rode ${formatKm(balance.totalDistanceKm)} (cost: ₹${balance.expectedCost}) but only paid ₹${
                  balance.actualFuelPaid
                }. You need to fill ₹${balance.pendingAmount} petrol or pay to admin.`}
              {isSettled &&
                `Your total petrol filled (₹${balance.actualFuelPaid}) matches your usage (${formatKm(
                  balance.totalDistanceKm
                )} = ₹${balance.expectedCost}) perfectly.`}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action & Details */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="bg-white/80 backdrop-blur-xs rounded-2xl border border-slate-200/80 p-3 flex items-center justify-around gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Petrol Used</p>
              <p className="text-sm font-extrabold text-slate-800 font-mono">
                {formatCurrency(balance.expectedCost)}
              </p>
              <p className="text-[10px] text-slate-400">{balance.expectedLitres} L</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Petrol Filled</p>
              <p className="text-sm font-extrabold text-emerald-700 font-mono">
                {formatCurrency(balance.actualFuelPaid)}
              </p>
              <p className="text-[10px] text-slate-400">by you</p>
            </div>
          </div>

          {isPending && (
            <Link
              href="/fuel/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition whitespace-nowrap"
            >
              <Fuel className="w-4 h-4" />
              <span>Fill Petrol Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {isExtra && (
            <Link
              href="/trips/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition whitespace-nowrap"
            >
              <span>Ride Company Bike</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
