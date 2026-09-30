"use client";

import React from "react";
import Image from "next/image";
import { Bike, Clock, Gauge, Tag, Flag, ArrowRight, Sparkles, CheckCircle2, Users } from "lucide-react";
import { Trip } from "@/types";

interface ActiveRideCardProps {
  trip: Trip;
  onEndRideClick: () => void;
}

export function ActiveRideCard({ trip, onEndRideClick }: ActiveRideCardProps) {
  const startedAt = trip.createdAt
    ? new Date(trip.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl border border-emerald-500/50 p-6 sm:p-7 animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Decorative Glow Circles */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-teal-400/15 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Section: Status & Ride Details */}
        <div className="space-y-4 max-w-xl">
          {/* Pulsing Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span>BIKE STARTED • RIDE IN PROGRESS</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{trip.purpose || "Active Ride"}</span>
              <Bike className="w-5 h-5 text-emerald-200" />
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
              You checked out the company bike. When you reach your stopping point, tap the button below to add your ending odometer reading.
            </p>
          </div>

          {/* Metric Chips Row */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
              <Gauge className="w-4 h-4 text-emerald-300" />
              <span>Starting Odo: <strong className="font-mono font-bold">{trip.startingKm.toLocaleString("en-IN")} km</strong></span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10">
              <Clock className="w-4 h-4 text-emerald-300" />
              <span>Started at: <strong>{startedAt || "Just now"}</strong></span>
            </div>

            {trip.isDoubleRide && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/30 backdrop-blur-xs border border-indigo-300/40 text-indigo-100 font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-200" />
                <span>
                  Co-Rider: <strong className="text-white">{trip.coRider ? trip.coRider.name : "Co-Rider"}</strong> (50% Split)
                </span>
              </div>
            )}

            {trip.remarks && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-emerald-100">
                <Tag className="w-3.5 h-3.5 text-emerald-300" />
                <span className="truncate max-w-[200px]">{trip.remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Start Photo Thumbnail + Big End Ride Button */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
          {trip.startOdometerPhoto && (
            <div className="flex items-center gap-2 self-start md:self-end bg-black/20 p-1.5 rounded-2xl border border-white/15">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.startOdometerPhoto}
                  alt="Start odometer photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="pr-2 text-[10px] text-emerald-100">
                <span className="font-bold block text-white">Start Photo</span>
                <span>Verified capture</span>
              </div>
            </div>
          )}

          {/* Big CTA: End Ride / Add Stop Reading */}
          <button
            type="button"
            onClick={onEndRideClick}
            className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-emerald-50 text-slate-900 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl transition duration-200 flex items-center justify-center gap-3 cursor-pointer group hover:scale-[1.02] active:scale-[0.99]"
          >
            <Flag className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <div className="text-left">
              <span className="block leading-tight text-sm font-extrabold text-slate-950">
                End Ride &amp; Add Stop Reading
              </span>
              <span className="block text-[10px] text-slate-500 font-medium leading-tight">
                Submit stopping point KM to finish
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
