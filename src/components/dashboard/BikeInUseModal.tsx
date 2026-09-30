"use client";

import React from "react";
import { Lock, Bike, AlertCircle, Phone, Clock, Gauge, X, User } from "lucide-react";
import { ActiveRiderInfo } from "@/types";

interface BikeInUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRider: ActiveRiderInfo | null;
  bikeName?: string;
  registrationNumber?: string;
}

export function BikeInUseModal({
  isOpen,
  onClose,
  currentRider,
  bikeName = "Honda Dio 125",
  registrationNumber = "KL 07 AB 1234",
}: BikeInUseModalProps) {
  if (!isOpen) return null;

  const startedTimeFormatted = currentRider?.startedAt
    ? new Date(currentRider.startedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Warning Accent Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Bike is Currently in Use</h2>
              <p className="text-xs text-amber-100 font-medium">
                {bikeName} ({registrationNumber})
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Main Notice Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold text-sm text-amber-950 mb-0.5">
                The last user has not added the ending odometer reading yet.
              </p>
              <p>
                Only after the current rider submits the stopping point odometer reading can another employee start a new trip.
              </p>
            </div>
          </div>

          {/* Current Rider Identity Card */}
          {currentRider && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Current Rider Details:
              </span>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {currentRider.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{currentRider.name}</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Riding Now
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {currentRider.mobile}
                    </p>
                  </div>
                </div>

                {/* Direct Phone Call Button */}
                {currentRider.mobile && (
                  <a
                    href={`tel:${currentRider.mobile}`}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1 text-xs font-semibold"
                    title={`Call ${currentRider.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>

              {/* Ride Details (Start time & Odometer) */}
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Started: <strong>{startedTimeFormatted || "In Progress"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Start Odo: <strong className="font-mono">{currentRider.startingKm.toLocaleString("en-IN")} km</strong></span>
                </div>
              </div>

              {currentRider.purpose && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400">Purpose: </span>
                  <strong className="text-slate-800">{currentRider.purpose}</strong>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-center text-slate-500">
            Please ask <strong>{currentRider?.name || "the current rider"}</strong> to open their dashboard and tap <em>&ldquo;End Ride&rdquo;</em> when finished.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
