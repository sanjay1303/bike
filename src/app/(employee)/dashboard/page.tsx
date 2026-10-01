"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bike,
  PlusCircle,
  Fuel,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  Edit2,
  Trash2,
  Gauge,
  Sparkles,
  LayoutDashboard,
  Clock,
  User as UserIcon,
  Bell,
  ChevronDown,
  Sun,
  IndianRupee,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Route,
  CheckCircle,
  Camera,
  Lock,
  Flag,
  Users,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { reportsApi, tripsApi } from "@/api";
import { formatCurrency, formatKm } from "@/lib/calculations";
import { EmployeeDashboardData, Trip, ActiveRiderInfo } from "@/types";
import { PetrolCalculator } from "@/components/dashboard/PetrolCalculator";
import { FuelBalanceBanner } from "@/components/dashboard/FuelBalanceBanner";
import { QuickOdometerScannerModal } from "@/components/dashboard/QuickOdometerScannerModal";
import { ActiveRideCard } from "@/components/dashboard/ActiveRideCard";
import { EndRideModal } from "@/components/dashboard/EndRideModal";
import { BikeInUseModal } from "@/components/dashboard/BikeInUseModal";
import { CoRideConfirmationCard } from "@/components/dashboard/CoRideConfirmationCard";
import { CoRideRejectedModal } from "@/components/dashboard/CoRideRejectedModal";
import { useRouter } from "next/navigation";

export default function EmployeeDashboard() {
  const router = useRouter();
  const toast = useToast();

  const [data, setData] = useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeFilter, setTimeFilter] = useState("This Month");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Deletion modal state
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Odometer Scanner modal state
  const [showQuickScanModal, setShowQuickScanModal] = useState(false);

  // Active Ride End modal state
  const [showEndRideModal, setShowEndRideModal] = useState(false);

  // Bike In Use concurrency modal state
  const [showBikeInUseModal, setShowBikeInUseModal] = useState(false);
  const [inUseRider, setInUseRider] = useState<ActiveRiderInfo | null>(null);

  // Co-Ride Rejection modal state
  const [dismissedRejectedIds, setDismissedRejectedIds] = useState<string[]>([]);
  const activeRejectedRide = data?.rejectedCoRides?.find((r) => !dismissedRejectedIds.includes(r.id)) || null;

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const json = await reportsApi.getEmployeeDashboard();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    try {
      setDeleting(true);
      await tripsApi.deleteTrip(tripToDelete.id);
      toast.success("Trip deleted successfully.");
      setTripToDelete(null);
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || "Network error while deleting trip.");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickScanClick = () => {
    if (data?.bikeLiveStatus?.inUse && data.bikeLiveStatus.currentRider?.id !== data.user.id) {
      setInUseRider(data.bikeLiveStatus.currentRider);
      setShowBikeInUseModal(true);
      return;
    }
    setShowQuickScanModal(true);
  };

  const handleAddTripClick = (e: React.MouseEvent) => {
    if (data?.bikeLiveStatus?.inUse && data.bikeLiveStatus.currentRider?.id !== data.user.id) {
      e.preventDefault();
      setInUseRider(data.bikeLiveStatus.currentRider);
      setShowBikeInUseModal(true);
    }
  };

  // Dynamic Greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Default demo recent trips if none logged yet, exactly matching the design
  const defaultRecentTrips = [
    {
      id: "trip-mock-1",
      day: "29",
      month: "Sep",
      time: "10:30 AM",
      purpose: "Client Visit",
      location: "Infopark",
      dotColor: "bg-emerald-500",
      distanceKm: 30,
      startingKm: 12550,
      endingKm: 12580,
    },
    {
      id: "trip-mock-2",
      day: "29",
      month: "Sep",
      time: "02:15 PM",
      purpose: "Client Visit",
      location: "Site Visit",
      dotColor: "bg-blue-500",
      distanceKm: 119,
      startingKm: 12580,
      endingKm: 12699,
    },
    {
      id: "trip-mock-3",
      day: "28",
      month: "Sep",
      time: "04:20 PM",
      purpose: "Client Visit",
      location: "Market",
      dotColor: "bg-amber-500",
      distanceKm: 20,
      startingKm: 12530,
      endingKm: 12550,
    },
    {
      id: "trip-mock-4",
      day: "27",
      month: "Sep",
      time: "11:10 AM",
      purpose: "Office Work",
      location: "Meeting",
      dotColor: "bg-purple-500",
      distanceKm: 40,
      startingKm: 12470,
      endingKm: 12510,
    },
  ];

  // Chart data from service or fallback
  const chartData = data?.monthlyChart || [
    { label: "1 Sep", distance: 30, fuelCost: 200 },
    { label: "5 Sep", distance: 48, fuelCost: 350 },
    { label: "10 Sep", distance: 38, fuelCost: 280 },
    { label: "15 Sep", distance: 55, fuelCost: 400 },
    { label: "20 Sep", distance: 42, fuelCost: 310 },
    { label: "25 Sep", distance: 72, fuelCost: 500 },
    { label: "30 Sep", distance: 22, fuelCost: 340 },
  ];
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center max-w-md shadow-lg">
          <p className="text-rose-600 font-semibold mb-3">{error || "Failed to load dashboard"}</p>
          <button
            onClick={() => fetchDashboard()}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md hover:bg-emerald-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, bike, stats, recentTrips } = data;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      {/* Main Dashboard Canvas */}
      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* ===================================================================== */}
          {/* HERO BANNER SECTION (Greeting + Motorcycle visual + Date chip)        */}
          {/* ===================================================================== */}
          <section className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 sm:p-8 overflow-hidden">
            {/* Soft Emerald Gradient Circle in Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-100/70 via-emerald-50/40 to-transparent blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Text Block */}
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-slate-600">{getGreeting()},</p>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                  <span>{firstName}</span>
                  <span className="text-3xl animate-bounce-subtle">👋</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium leading-relaxed max-w-md">
                  Track your trips, manage fuel expenses and keep the company bike on the move.
                </p>
              </div>

              {/* Center / Right Motorcycle Graphic & Handwritten Tag */}
              <div className="relative flex items-center justify-center lg:justify-end shrink-0 py-2">
                {/* Handwritten Tag "Keep Tracking! ⤹" */}
                <div className="absolute -top-1 left-2 sm:-left-6 z-20 pointer-events-none flex items-center gap-1.5 select-none">
                  <span className="text-emerald-700 font-bold text-sm tracking-wide italic font-serif">
                    Keep Tracking!
                  </span>
                  <svg className="w-6 h-6 text-emerald-600 -rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                {/* Motorcycle / Scooter Illustration */}
                <div className="relative w-72 sm:w-88 h-44 sm:h-52 drop-shadow-xl hover:scale-102 transition duration-300">
                  <Image
                    src="/honda-dio-125.png"
                    alt="Honda Dio 125 - Company Bike"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Top Right Date & Weather Chip */}
                <div className="absolute top-0 right-0 hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xs backdrop-blur-xs">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 leading-none">
                      {new Date().toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Kochi, 28°C</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* PENDING CO-RIDE CONFIRMATION REQUESTS                                */}
          {/* ===================================================================== */}
          {data.pendingCoRides && data.pendingCoRides.length > 0 && (
            <CoRideConfirmationCard
              requests={data.pendingCoRides}
              onActionComplete={fetchDashboard}
            />
          )}

          {/* ===================================================================== */}
          {/* ACTIVE RIDE CARD (If current user has started a ride)                  */}
          {/* ===================================================================== */}
          {data.activeTrip && (
            <ActiveRideCard
              trip={data.activeTrip}
              onEndRideClick={() => setShowEndRideModal(true)}
            />
          )}

          {/* ===================================================================== */}
          {/* BIKE IN USE NOTICE BANNER (If another user is currently riding)       */}
          {/* ===================================================================== */}
          {!data.activeTrip && data.bikeLiveStatus?.inUse && data.bikeLiveStatus.currentRider && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 block">
                    Bike is Currently in Use by {data.bikeLiveStatus.currentRider.name}
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Last user has not added ending odometer reading yet &bull; Started at {new Date(data.bikeLiveStatus.currentRider.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInUseRider(data.bikeLiveStatus?.currentRider || null);
                  setShowBikeInUseModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
              >
                View Rider Details
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* PETROL BALANCE & RECONCILIATION BANNER                                 */}
          {/* ===================================================================== */}
          {data.fuelBalance && (
            <FuelBalanceBanner
              balance={data.fuelBalance}
              mileageTarget={bike.mileageTarget || 30}
              fuelPrice={(bike as any).fuelPrice || 113}
            />
          )}

          {/* ===================================================================== */}
          {/* 4 METRIC KPI CARDS                                                    */}
          {/* ===================================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Trips */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Route className="w-4 h-4" />
                  </div>
                  <span>Total Trips</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                  {stats.totalTrips}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span>&uarr;</span>
                  <span>+25% from last month</span>
                </div>
              </div>
              {/* Decorative mini bar graphic */}
              <div className="flex items-end gap-1 h-8 opacity-25 pr-1">
                <div className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
                <div className="w-1.5 h-5 bg-emerald-500 rounded-xs" />
                <div className="w-1.5 h-8 bg-emerald-500 rounded-xs" />
              </div>
            </div>

            {/* Total Distance */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>Total Distance</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                  {formatKm(stats.totalDistanceKm)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span>&uarr;</span>
                  <span>+18% from last month</span>
                </div>
              </div>
              {/* Decorative mini bar graphic */}
              <div className="flex items-end gap-1 h-8 opacity-25 pr-1">
                <div className="w-1.5 h-4 bg-blue-500 rounded-xs" />
                <div className="w-1.5 h-6 bg-blue-500 rounded-xs" />
                <div className="w-1.5 h-8 bg-blue-500 rounded-xs" />
              </div>
            </div>

            {/* My Fuel Cost */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <span>My Fuel Cost</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                  {formatCurrency(stats.myFuelCost)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span>&uarr;</span>
                  <span>+12% from last month</span>
                </div>
              </div>
              {/* Decorative mini bar graphic */}
              <div className="flex items-end gap-1 h-8 opacity-25 pr-1">
                <div className="w-1.5 h-5 bg-amber-500 rounded-xs" />
                <div className="w-1.5 h-4 bg-amber-500 rounded-xs" />
                <div className="w-1.5 h-8 bg-amber-500 rounded-xs" />
              </div>
            </div>

            {/* Avg. Distance / Trip */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Avg. Distance / Trip</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
                  {stats.avgDistancePerTrip} km
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600">
                  <span>&uarr;</span>
                  <span>+8% from last month</span>
                </div>
              </div>
              {/* Decorative mini bar graphic */}
              <div className="flex items-end gap-1 h-8 opacity-25 pr-1">
                <div className="w-1.5 h-3 bg-purple-500 rounded-xs" />
                <div className="w-1.5 h-7 bg-purple-500 rounded-xs" />
                <div className="w-1.5 h-5 bg-purple-500 rounded-xs" />
              </div>
            </div>
          </section>

          {/* ===================================================================== */}
          {/* PRIMARY QUICK ACTION BUTTONS (Start Bike, Add Trip & Fuel Entry)       */}
          {/* ===================================================================== */}
          <section className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleQuickScanClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer min-w-[190px]"
            >
              <Camera className="w-4 h-4 text-emerald-100" />
              <span>Start Bike (Scan Odo)</span>
              <Sparkles className="w-3.5 h-3.5 ml-auto text-emerald-200" />
            </button>

            <Link
              href="/trips/new"
              onClick={handleAddTripClick}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#0B7A51] hover:bg-[#096844] text-white text-xs font-bold rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer min-w-[190px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Trip</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>

            <Link
              href="/fuel/new"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-emerald-50/50 text-slate-800 border border-emerald-500 text-xs font-bold rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer min-w-[190px]"
            >
              <Fuel className="w-4 h-4 text-emerald-600" />
              <span>Add Fuel Entry</span>
              <ArrowRight className="w-4 h-4 ml-auto text-emerald-600" />
            </Link>
          </section>

          {/* ===================================================================== */}
          {/* MAIN 2-COLUMN SECTION: Recent Trips (60%) & Right Widgets (40%)       */}
          {/* ===================================================================== */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ------------------------------------------------------------------- */}
            {/* LEFT: Recent Trips Card (~65% = 7 cols on lg, 8 cols on xl)         */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-tight">Recent Trips</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Your latest logged journeys on Company Bike</p>
                    </div>
                  </div>

                  <Link
                    href="/history"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>

                {/* Trips Table */}
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-3">Date & Time</th>
                        <th className="py-3 px-3">Purpose</th>
                        <th className="py-3 px-3 text-center">Distance</th>
                        <th className="py-3 px-3">KM (Start &rarr; End)</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {/* If user has real recent trips in DB, render them */}
                      {recentTrips && recentTrips.length > 0 ? (
                        recentTrips.map((trip, idx) => {
                          const tripDate = new Date(trip.date);
                          const day = tripDate.getDate();
                          const month = tripDate.toLocaleString("en-IN", { month: "short" });
                          const time = tripDate.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          // Color based on index / purpose
                          const dotColors = [
                            "bg-emerald-500",
                            "bg-blue-500",
                            "bg-amber-500",
                            "bg-purple-500",
                          ];
                          const dotColor = dotColors[idx % dotColors.length];

                          return (
                            <tr key={trip.id} className="hover:bg-slate-50/70 transition group">
                              {/* Date & Time */}
                              <td className="py-4 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="text-center w-8">
                                    <span className="block font-black text-sm text-slate-900 leading-none">{day}</span>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase">{month}</span>
                                  </div>
                                  <span className="text-slate-500 font-mono text-xs">{time}</span>
                                </div>
                              </td>

                              {/* Purpose & Remarks */}
                              <td className="py-4 px-3 whitespace-nowrap">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                    <span className="font-bold text-slate-800">{trip.purpose}</span>
                                    {trip.hasFuelEntry && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                        ⛽ Fuel Refilled
                                      </span>
                                    )}
                                    {trip.isDoubleRide && (
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        trip.coRiderConfirmation === "CONFIRMED"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      }`}>
                                        <Users className="w-2.5 h-2.5" />
                                        <span>
                                          Double ({trip.coRider?.name || "Co-rider"}) &bull; {
                                            trip.coRiderConfirmation === "CONFIRMED"
                                              ? "Confirmed"
                                              : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                              ? "Not Confirmed"
                                              : "Pending"
                                          }
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-4">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span>{trip.remarks || "Official Journey"}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Distance */}
                              <td className="py-4 px-3 text-center whitespace-nowrap">
                                <span className="inline-block bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                  {trip.distanceKm} km
                                </span>
                                {trip.isDoubleRide && (
                                  <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                    Split: ~{Math.round(trip.distanceKm / 2)} km
                                  </div>
                                )}
                              </td>

                              {/* KM Start -> End */}
                              <td className="py-4 px-3 whitespace-nowrap font-mono text-slate-600 text-xs">
                                {trip.startingKm.toLocaleString("en-IN")} &rarr; {trip.endingKm.toLocaleString("en-IN")}
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <Link
                                    href={`/history?editTrip=${trip.id}`}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                    title="Edit trip"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setTripToDelete(trip)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete trip"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        /* Fallback to matching demo rows from design */
                        defaultRecentTrips.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/70 transition group">
                            {/* Date & Time */}
                            <td className="py-4 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="text-center w-8">
                                  <span className="block font-black text-sm text-slate-900 leading-none">{row.day}</span>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase">{row.month}</span>
                                </div>
                                <span className="text-slate-500 font-mono text-xs">{row.time}</span>
                              </div>
                            </td>

                            {/* Purpose & Remarks */}
                            <td className="py-4 px-3 whitespace-nowrap">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${row.dotColor}`} />
                                  <span className="font-bold text-slate-800">{row.purpose}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-4">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{row.location}</span>
                                </div>
                              </div>
                            </td>

                            {/* Distance */}
                            <td className="py-4 px-3 text-center whitespace-nowrap">
                              <span className="inline-block bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                {row.distanceKm} km
                              </span>
                            </td>

                            {/* KM Start -> End */}
                            <td className="py-4 px-3 whitespace-nowrap font-mono text-slate-600 text-xs">
                              {row.startingKm.toLocaleString("en-IN")} &rarr; {row.endingKm.toLocaleString("en-IN")}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <Link
                                  href="/history"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                  title="View details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => toast.info("Demo item: Add trips using + Add New Trip")}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete trip"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Card Summary */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Showing latest company bike journeys</span>
                <Link href="/trips/new" className="text-emerald-600 font-semibold hover:underline">
                  + Add another trip
                </Link>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: 3 Cards (~35% = 5 cols on lg, 4 cols on xl)           */}
            {/* ------------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* WIDGET 1: Company Bike Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">Company Bike</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                          {bike.status === "AVAILABLE" ? "Available" : bike.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {bike.registrationNumber || "KL 07 AB 1234"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">
                      Odometer: <strong className="text-slate-900 font-mono">{formatKm(bike.currentKm || 12699)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px]">
                      Fuel Type: <strong className="text-slate-900">{bike.fuelType || "Petrol"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* WIDGET 2: This Month Overview (Dual Bar Chart) */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">This Month Overview</h3>
                  {/* Dropdown Selector */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 select-none">
                    <span>{timeFilter}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mb-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                    <span className="text-slate-600 text-[11px]">Distance (km)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                    <span className="text-slate-600 text-[11px]">Fuel Cost (₹)</span>
                  </div>
                </div>

                {/* Interactive Bar Chart Graphic */}
                <div className="relative pt-2 pb-1">
                  {/* Y-Axis labels (Left: Distance, Right: Fuel ₹) */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1 px-1">
                    <span>80 km</span>
                    <span>₹800</span>
                  </div>

                  {/* Chart Grid & Bars Container */}
                  <div className="h-36 flex items-end justify-between gap-2 px-2 border-b border-slate-100 relative">
                    {/* Background gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                      <div className="border-b border-dashed border-slate-200 w-full h-0" />
                      <div className="border-b border-dashed border-slate-200 w-full h-0" />
                      <div className="border-b border-dashed border-slate-200 w-full h-0" />
                      <div className="border-b border-slate-200 w-full h-0" />
                    </div>

                    {chartData.map((bar, i) => {
                      // Max Distance: 80km, Max Fuel Cost: 800
                      const distHeightPct = Math.min(100, Math.round((bar.distance / 80) * 100));
                      const fuelHeightPct = Math.min(100, Math.round((bar.fuelCost / 800) * 100));
                      const isHovered = hoveredBarIndex === i;

                      return (
                        <div
                          key={bar.label}
                          onMouseEnter={() => setHoveredBarIndex(i)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                        >
                          {/* Tooltip on Hover */}
                          {isHovered && (
                            <div className="absolute -top-12 z-30 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in-50 zoom-in-95">
                              <p className="font-bold">{bar.label}</p>
                              <p className="text-emerald-400">{bar.distance} km &bull; ₹{bar.fuelCost}</p>
                            </div>
                          )}

                          {/* Bars Pair (Distance in green, Fuel in teal) */}
                          <div className="flex items-end gap-1 w-full justify-center">
                            {/* Distance Bar */}
                            <div
                              style={{ height: `${distHeightPct}%` }}
                              className="w-2 sm:w-2.5 bg-[#059669] rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                            />
                            {/* Fuel Cost Bar */}
                            <div
                              style={{ height: `${fuelHeightPct}%` }}
                              className="w-2 sm:w-2.5 bg-[#0D9488] rounded-t-sm group-hover:brightness-110 transition-all duration-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-Axis Dates */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-2 px-1">
                    {chartData.map((bar) => (
                      <span key={bar.label}>{bar.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* WIDGET 3: Quick Stats */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">Quick Stats</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
                  {/* Distance Traveled */}
                  <div className="px-1 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                      <Route className="w-4 h-4" />
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {formatKm(stats.totalDistanceKm)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Distance Traveled</p>
                  </div>

                  {/* Fuel Consumed */}
                  <div className="px-1 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {stats.fuelConsumedLitres || 12.5} L
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Fuel Consumed</p>
                  </div>

                  {/* Avg. Price / Litre */}
                  <div className="px-1 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                      ₹{(stats.avgPricePerLitre || 100).toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Avg. Price / Litre</p>
                  </div>
                </div>
              </div>

              {/* WIDGET 4: Petrol Expense Calculator */}
              <PetrolCalculator initialDistance={30} initialMileage={30} initialPrice={113} />
            </div>
          </section>
        </main>

      {/* Confirmation Dialog for Delete */}
      <ConfirmModal
        isOpen={Boolean(tripToDelete)}
        title="Delete this trip?"
        message={`Are you sure you want to delete this trip (${tripToDelete?.distanceKm} km for ${tripToDelete?.purpose})? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteTrip}
        onClose={() => setTripToDelete(null)}
      />

      {/* Quick Odometer Scanner Modal */}
      <QuickOdometerScannerModal
        isOpen={showQuickScanModal}
        onClose={() => setShowQuickScanModal(false)}
        bike={bike}
        onOdometerUpdated={fetchDashboard}
        onBikeInUse={(rider) => {
          setInUseRider(rider);
          setShowBikeInUseModal(true);
        }}
      />

      {/* End Ride / Add Stop Reading Modal */}
      <EndRideModal
        isOpen={showEndRideModal}
        onClose={() => setShowEndRideModal(false)}
        activeTrip={data.activeTrip || null}
        bike={bike}
        onTripCompleted={fetchDashboard}
      />

      {/* Bike In Use Warning Modal (Shows last user who has not added stop reading) */}
      <BikeInUseModal
        isOpen={showBikeInUseModal}
        onClose={() => setShowBikeInUseModal(false)}
        currentRider={inUseRider || data.bikeLiveStatus?.currentRider || null}
        bikeName={bike?.name}
        registrationNumber={bike?.registrationNumber}
      />

      {/* Co-Rider Declined / Rejected Modal Popup */}
      <CoRideRejectedModal
        isOpen={Boolean(activeRejectedRide)}
        onClose={() => {
          if (activeRejectedRide) {
            setDismissedRejectedIds((prev) => [...prev, activeRejectedRide.id]);
          }
        }}
        rejectedTrip={activeRejectedRide}
        onCreateNewTrip={() => {
          if (activeRejectedRide) {
            setDismissedRejectedIds((prev) => [...prev, activeRejectedRide.id]);
          }
          router.push("/trips/new");
        }}
      />
    </>
  );
}
