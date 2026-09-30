"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Gauge,
  Fuel,
  IndianRupee,
  TrendingUp,
  Bike,
  Sparkles,
  Users,
  Activity,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
  X,
  HandCoins,
  History,
  Phone,
  Clock,
  User,
  Unlock,
  Lock,
} from "lucide-react";
import { AdminDashboardData } from "@/types";
import { reportsApi, settlementsApi, bikeApi, tripsApi } from "@/api";
import { formatCurrency, formatKm } from "@/lib/calculations";
import { useToast } from "@/components/common/Toast";

export default function AdminDashboardPage() {
  const toast = useToast();

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [range, setRange] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  // Settlement modal state
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleType, setSettleType] = useState<"COLLECTED_FROM_EMPLOYEE" | "REIMBURSED_TO_EMPLOYEE" | "BALANCE_CLEAR">("COLLECTED_FROM_EMPLOYEE");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [settling, setSettling] = useState(false);

  // Petrol Rate Edit modal state
  const [petrolRateModalOpen, setPetrolRateModalOpen] = useState(false);
  const [newPetrolRate, setNewPetrolRate] = useState<string>("113");
  const [savingPetrolRate, setSavingPetrolRate] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const json = await reportsApi.getAdminDashboard(range);
      setData(json);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openSettleModal = (emp: any) => {
    setSelectedEmp(emp);
    const balance = emp.fuelBalance;
    if (balance) {
      if (balance.status === "PENDING_PAYMENT") {
        setSettleAmount(balance.pendingAmount.toString());
        setSettleType("COLLECTED_FROM_EMPLOYEE");
        setSettleNotes(`Cash collected from ${emp.name} for fuel used`);
      } else if (balance.status === "EXTRA_BALANCE") {
        setSettleAmount(balance.surplusAmount.toString());
        setSettleType("REIMBURSED_TO_EMPLOYEE");
        setSettleNotes(`Reimbursement paid to ${emp.name} for extra petrol`);
      } else {
        setSettleAmount("0");
        setSettleType("BALANCE_CLEAR");
        setSettleNotes("Account balance verified & settled");
      }
    } else {
      setSettleAmount("0");
      setSettleType("COLLECTED_FROM_EMPLOYEE");
      setSettleNotes("");
    }
    setSettleModalOpen(true);
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    const numAmount = Number(settleAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid settlement amount.");
      return;
    }

    try {
      setSettling(true);
      await settlementsApi.create({
        userId: selectedEmp.id,
        amount: numAmount,
        type: settleType,
        notes: settleNotes || undefined,
      });

      toast.success(`Settlement of ₹${numAmount} recorded for ${selectedEmp.name}!`);
      setSettleModalOpen(false);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Failed to record settlement");
    } finally {
      setSettling(false);
    }
  };

  const handleUpdatePetrolRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(newPetrolRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid petrol rate per litre.");
      return;
    }

    try {
      setSavingPetrolRate(true);
      await bikeApi.updateBike({ fuelPrice: rate });
      toast.success(`Fleet Petrol Rate successfully updated to ₹${rate} / Litre!`);
      setPetrolRateModalOpen(false);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Failed to update petrol rate");
    } finally {
      setSavingPetrolRate(false);
    }
  };

  const handleForceRelease = async (tripId: string) => {
    if (!confirm("Are you sure you want to force-release the bike? This will finish the active ride and mark the bike as AVAILABLE.")) return;
    try {
      await tripsApi.forceReleaseBike(tripId);
      toast.success("Bike released successfully! Status is now AVAILABLE.");
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Failed to release bike");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading admin intelligence...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, bike, employeeUsage, recentActivity, monthlyStats, fuelReconciliation, recentSettlements } = data;

  const maxDistance = Math.max(...monthlyStats.map((m) => m.distanceKm), 100);
  const maxFuelCost = Math.max(...monthlyStats.map((m) => m.fuelCost), 1000);

  const pendingEmployeesCount = employeeUsage.filter((e) => e.fuelBalance?.status === "PENDING_PAYMENT").length;
  const surplusEmployeesCount = employeeUsage.filter((e) => e.fuelBalance?.status === "EXTRA_BALANCE").length;

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Bar with Date Range Selector and Petrol Rate Quick Editor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet analytics, trip distances, and petrol expense balances across all employees
          </p>
        </div>

        {/* Top Controls: Petrol Rate Button & Date Filter */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Quick Edit Petrol Rate Button (Admin Only) */}
          <button
            type="button"
            onClick={() => {
              setNewPetrolRate((bike.fuelPrice || 113).toString());
              setPetrolRateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer group"
            title="Edit company petrol rate"
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-600" />
            <span>Petrol: ₹{bike.fuelPrice || 113}/L</span>
            <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase group-hover:bg-emerald-300">
              Edit
            </span>
          </button>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last3Months">Last 3 Months</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PETROL BALANCE RECONCILIATION SUMMARY (HIGHLIGHTED SECTION)               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pending Due to Admin */}
        <div className="bg-gradient-to-br from-rose-50 to-amber-50/50 p-5 rounded-3xl border border-amber-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pending Due</span>
            <div className="p-2 rounded-xl bg-amber-100/80 text-amber-800">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
            {formatCurrency(fuelReconciliation?.totalPendingDue || 0)}
          </div>
          <p className="text-[11px] text-amber-800/80 font-medium mt-1">
            {pendingEmployeesCount} employee{pendingEmployeesCount !== 1 ? "s" : ""} need to pay admin or refill
          </p>
        </div>

        {/* Total Extra Surplus Credit */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-3xl border border-emerald-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Extra Credit</span>
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
            +{formatCurrency(fuelReconciliation?.totalSurplusCredit || 0)}
          </div>
          <p className="text-[11px] text-emerald-800/80 font-medium mt-1">
            {surplusEmployeesCount} employee{surplusEmployeesCount !== 1 ? "s" : ""} pre-filled extra petrol
          </p>
        </div>

        {/* Expected Fuel Cost Based on KM */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expected Petrol Cost</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(fuelReconciliation?.totalExpectedFuelCost || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.totalDistanceKm} km @ {bike.mileageTarget || 30} km/L &bull; ₹{bike.fuelPrice || 113}/L
          </p>
        </div>

        {/* Actual Petrol Paid (Refills) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Actual Petrol Paid</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCurrency(fuelReconciliation?.totalFuelPaid || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All fuel bills logged by staff</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 FLEET KPI CARDS                                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Distance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fleet Distance</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatKm(stats.totalDistanceKm)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Recorded trip odometer sum</p>
        </div>

        {/* Total Fuel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Fuel</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalFuelLitres} L</div>
          <p className="text-[11px] text-slate-400 mt-1">Litres pumped in company bike</p>
        </div>

        {/* Average Cost / KM */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Cost / KM</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">₹{stats.averageCostPerKm} / km</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.fleetMileage ? `Mileage: ${stats.fleetMileage} km/L` : "Fleet economy"}
          </p>
        </div>

        {/* Company Bike Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Primary Bike</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {bike.registrationNumber || "KL 07 AB 1234"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Odo: {formatKm(bike.currentKm || 0)}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIVE BIKE CUSTODY & OPERATIONS STATUS (CURRENT RIDER vs LAST USED BY)     */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Company Bike Live Custody &amp; Operational Status</span>
                <span className="text-xs font-mono font-bold text-slate-600 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                  {bike.registrationNumber} ({bike.name})
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Real-time rider tracking, checkout status, and previous trip details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Current Odo:</span>
            <span className="text-xs font-mono font-bold text-slate-900 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200">
              {formatKm(bike.currentKm || 0)}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: CURRENTLY USING */}
          <div className={`p-5 rounded-2xl border transition ${
            data.bikeLiveStatus?.inUse
              ? "bg-amber-50/70 border-amber-200 text-amber-950"
              : "bg-emerald-50/50 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-700" />
                Currently Using
              </span>
              {data.bikeLiveStatus?.inUse ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Ride in Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Available (Parked)
                </span>
              )}
            </div>

            <div className="pt-3.5 space-y-3">
              {data.bikeLiveStatus?.inUse && data.bikeLiveStatus.currentRider ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {data.bikeLiveStatus.currentRider.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {data.bikeLiveStatus.currentRider.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {data.bikeLiveStatus.currentRider.mobile}
                        </p>
                      </div>
                    </div>

                    {data.bikeLiveStatus.currentRider.mobile && (
                      <a
                        href={`tel:${data.bikeLiveStatus.currentRider.mobile}`}
                        className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition flex items-center gap-1 shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Rider</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-xl border border-amber-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Started At</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(data.bikeLiveStatus.currentRider.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Starting Odo</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {data.bikeLiveStatus.currentRider.startingKm.toLocaleString("en-IN")} km
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-white/80 p-3 rounded-xl border border-amber-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Trip Purpose</span>
                      <span className="font-medium text-slate-800">{data.bikeLiveStatus.currentRider.purpose}</span>
                    </div>
                    {data.bikeLiveStatus.currentRider.startOdometerPhoto && (
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.bikeLiveStatus.currentRider.startOdometerPhoto}
                          alt="Start photo"
                          className="w-8 h-8 rounded-lg object-cover border border-slate-300"
                        />
                        <span className="text-[10px] font-bold text-emerald-700">Start Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Admin Force Release Button */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleForceRelease(data.bikeLiveStatus!.activeTrip!.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Force Release Bike</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Bike is currently parked &amp; available</p>
                  <p className="text-xs text-slate-500">Any employee can scan the odometer and start a new ride.</p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: LAST USED BY */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-slate-700">
                <History className="w-4 h-4 text-slate-500" />
                Last Used By
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Previous Completed Ride</span>
            </div>

            <div className="pt-3.5 space-y-3">
              {data.bikeLiveStatus?.lastRider ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {data.bikeLiveStatus.lastRider.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {data.bikeLiveStatus.lastRider.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {data.bikeLiveStatus.lastRider.mobile}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Completed At</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(data.bikeLiveStatus.lastRider.endedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })},{" "}
                        {new Date(data.bikeLiveStatus.lastRider.endedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Ending Odo &bull; Distance</span>
                      <span className="font-mono font-bold text-slate-900">
                        {data.bikeLiveStatus.lastRider.endingKm.toLocaleString("en-IN")} km ({data.bikeLiveStatus.lastRider.distanceKm} km ride)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Purpose</span>
                    <span className="font-medium text-slate-800">{data.bikeLiveStatus.lastRider.purpose}</span>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No completed rides recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* EMPLOYEE PETROL BALANCE & SETTLEMENTS LEDGER TABLE                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-emerald-600" />
              Employee Petrol Balance & Settlements Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks petrol used (KM / 30km/L &bull; ₹113) vs actual petrol filled by each employee.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {employeeUsage.length} Staff Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">KM Ridden</th>
                <th className="py-3.5 px-4">Petrol Used (₹)</th>
                <th className="py-3.5 px-4">Petrol Filled (₹)</th>
                <th className="py-3.5 px-4">Balance Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {employeeUsage.map((emp) => {
                const balance = emp.fuelBalance;
                const isPending = balance?.status === "PENDING_PAYMENT";
                const isExtra = balance?.status === "EXTRA_BALANCE";
                const isSettled = balance?.status === "SETTLED";

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    {/* Employee info */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">+91 {emp.mobile}</div>
                    </td>

                    {/* Total KM */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{formatKm(emp.totalKm)}</span>
                      <span className="text-[10px] text-slate-400 block">{emp.tripsCount} trips</span>
                    </td>

                    {/* Petrol Used (Expected) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(balance?.expectedCost || 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ≈ {balance?.expectedLitres || 0} L
                      </span>
                    </td>

                    {/* Petrol Filled (Actual) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(balance?.actualFuelPaid || emp.fuelCost)}
                      </span>
                      {emp.settlementsOffset && emp.settlementsOffset !== 0 ? (
                        <span className="text-[10px] text-slate-400 block">
                          Settled: {emp.settlementsOffset > 0 ? `+₹${emp.settlementsOffset}` : `-₹${Math.abs(emp.settlementsOffset)}`}
                        </span>
                      ) : null}
                    </td>

                    {/* Balance Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isPending && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>₹{balance.pendingAmount} Due (Pending)</span>
                        </div>
                      )}
                      {isExtra && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+₹{balance.surplusAmount} Extra Credit</span>
                        </div>
                      )}
                      {isSettled && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>₹0 (Settled)</span>
                        </div>
                      )}
                    </td>

                    {/* Action: Settle Balance */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openSettleModal(emp)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                          isPending
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : isExtra
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Settle Balance</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Analytics Charts (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Distance Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Distance (KM)</h2>
              <p className="text-xs text-slate-400">Kilometers driven over recent months</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {monthlyStats.map((item, idx) => {
              const heightPct = Math.round((item.distanceKm / maxDistance) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition">
                    {item.distanceKm}k
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 truncate">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Fuel Expense Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Fuel Expense (₹)</h2>
              <p className="text-xs text-slate-400">Petrol reimbursement trends</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {monthlyStats.map((item, idx) => {
              const heightPct = Math.round((item.fuelCost / maxFuelCost) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition">
                    ₹{item.fuelCost}
                  </span>
                  <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 truncate">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom 2 Columns: Recent Settlements & Recent Fleet Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Settlements Ledger */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Fuel Settlements</h2>
            </div>
            <span className="text-[11px] text-slate-400">Reconciliations</span>
          </div>

          <div className="space-y-3 flex-1">
            {!recentSettlements || recentSettlements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No cash settlements recorded yet</p>
            ) : (
              recentSettlements.map((st) => (
                <div key={st.id} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{st.user?.name || "Employee"}</p>
                    <p className="text-[10px] text-slate-500">
                      {st.type === "COLLECTED_FROM_EMPLOYEE"
                        ? "Cash collected from employee"
                        : st.type === "REIMBURSED_TO_EMPLOYEE"
                        ? "Reimbursed to employee"
                        : "Balance cleared"}
                    </p>
                    {st.notes && <p className="text-[10px] text-slate-400 italic">"{st.notes}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-extrabold text-sm text-slate-900">
                      {formatCurrency(Math.abs(st.amount))}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(st.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Fleet Activity Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Fleet Activity</h2>
          </div>

          <div className="space-y-3.5 flex-1">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent actions logged</p>
            ) : (
              recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === "TRIP"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {act.type === "TRIP" ? <Bike className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">{act.userName}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 ml-1">
                        {act.amountOrDist}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{act.description}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECORD SETTLEMENT MODAL                                                   */}
      {/* ========================================================================= */}
      {settleModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Settle Balance: {selectedEmp.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Summary Box */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-bold text-slate-800">{selectedEmp.name} (+91 {selectedEmp.mobile})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total KM Ridden:</span>
                <span className="font-semibold text-slate-800">{formatKm(selectedEmp.totalKm)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Petrol Used (Calculated):</span>
                <span className="font-mono text-slate-800">{formatCurrency(selectedEmp.fuelBalance?.expectedCost || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Petrol Refilled:</span>
                <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(selectedEmp.fuelBalance?.actualFuelPaid || 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-700">Current Status:</span>
                {selectedEmp.fuelBalance?.status === "PENDING_PAYMENT" ? (
                  <span className="text-rose-600">₹{selectedEmp.fuelBalance.pendingAmount} Due to Company</span>
                ) : selectedEmp.fuelBalance?.status === "EXTRA_BALANCE" ? (
                  <span className="text-emerald-700">+₹{selectedEmp.fuelBalance.surplusAmount} Extra Balance</span>
                ) : (
                  <span className="text-slate-600">₹0 Settled</span>
                )}
              </div>
            </div>

            <form onSubmit={handleRecordSettlement} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Settlement Type</label>
                <select
                  value={settleType}
                  onChange={(e) => setSettleType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl font-medium"
                >
                  <option value="COLLECTED_FROM_EMPLOYEE">Collect Cash from Employee (Cleared Due)</option>
                  <option value="REIMBURSED_TO_EMPLOYEE">Reimburse Extra Credit to Employee</option>
                  <option value="BALANCE_CLEAR">Mark Balance as Settled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <div className="flex items-center rounded-xl border border-slate-300">
                  <span className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 font-bold rounded-l-xl">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="500"
                    className="w-full px-3 py-2 rounded-r-xl font-mono focus:outline-hidden font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g., Cash collected in office"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {settling ? "Recording..." : "Save Settlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PETROL RATE MODAL (ADMIN ONLY)                                      */}
      {/* ========================================================================= */}
      {petrolRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Update Petrol Rate
                  </h3>
                  <p className="text-[11px] text-slate-400">Admin-only fleet configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPetrolRateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>Current Rate:</span>
                <span className="font-mono text-sm font-extrabold text-emerald-800">
                  ₹{bike.fuelPrice || 113} / Litre
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80">
                Updating this rate will auto-fill employee fuel entry quantities and calculate accurate petrol balances.
              </p>
            </div>

            <form onSubmit={handleUpdatePetrolRate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Petrol Rate per Litre (₹) *
                </label>
                <div className="flex items-center rounded-xl border border-slate-300">
                  <span className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 font-bold rounded-l-xl">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={newPetrolRate}
                    onChange={(e) => setNewPetrolRate(e.target.value)}
                    placeholder="113"
                    className="w-full px-3 py-2 rounded-r-xl font-mono text-base font-bold text-slate-900 focus:outline-hidden"
                    required
                  />
                  <span className="px-3 py-2 bg-slate-50 border-l border-slate-200 text-slate-500 font-semibold rounded-r-xl">
                    / Litre
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPetrolRateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPetrolRate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {savingPetrolRate ? "Updating..." : "Save Petrol Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

