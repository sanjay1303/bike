"use client";

import React, { useState } from "react";
import { Users, XCircle, AlertTriangle, Phone, Calendar, ArrowRight, PlusCircle, X, Sparkles } from "lucide-react";
import { RejectedCoRideInfo } from "@/types";
import { tripsApi } from "@/api";
import { useToast } from "@/components/common/Toast";

interface CoRideRejectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectedTrip: RejectedCoRideInfo | null;
  onCreateNewTrip: () => void;
}

export function CoRideRejectedModal({
  isOpen,
  onClose,
  rejectedTrip,
  onCreateNewTrip,
}: CoRideRejectedModalProps) {
  const toast = useToast();
  const [acknowledging, setAcknowledging] = useState(false);

  if (!isOpen || !rejectedTrip) return null;

  const coRiderName = rejectedTrip.coRider?.name || "The selected co-rider";
  const coRiderMobile = rejectedTrip.coRider?.mobile || "";

  const handleDismiss = async () => {
    try {
      setAcknowledging(true);
      await tripsApi.acknowledgeRejection(rejectedTrip.id);
    } catch (err) {
      console.warn("Could not acknowledge rejection via API:", err);
    } finally {
      setAcknowledging(false);
      onClose();
    }
  };

  const handleCreateNewTrip = async () => {
    try {
      setAcknowledging(true);
      await tripsApi.acknowledgeRejection(rejectedTrip.id);
    } catch (err) {
      console.warn("Could not acknowledge rejection via API:", err);
    } finally {
      setAcknowledging(false);
      onClose();
      onCreateNewTrip();
    }
  };

  const dateFormatted = rejectedTrip.date
    ? new Date(rejectedTrip.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Urgent Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white">
                  Double Ride Cancelled
                </span>
              </div>
              <h2 className="text-base font-bold tracking-tight">Co-Rider Declined Confirmation</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={acknowledging}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Main Cancellation Alert Banner */}
          <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                Confirmation Rejected
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                <strong className="font-semibold text-rose-950">{coRiderName}</strong> declined the double ride confirmation. He is cancelled, so please create a new trip.
              </p>
            </div>
          </div>

          {/* Trip Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Trip Purpose:</span>
              <strong className="text-slate-900 font-semibold">{rejectedTrip.purpose}</strong>
            </div>

            {dateFormatted && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Trip Date:
                </span>
                <span className="text-slate-700 font-mono text-[11px]">{dateFormatted}</span>
              </div>
            )}

            {coRiderMobile && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Contact Co-Rider:</span>
                <a
                  href={`tel:${coRiderMobile}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition"
                >
                  <Phone className="w-3 h-3 text-indigo-600" />
                  <span>+91 {coRiderMobile}</span>
                </a>
              </div>
            )}
          </div>

          {/* Action Prompt */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] leading-tight font-medium">
              You can start a fresh solo ride or select another co-rider now.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={acknowledging}
              className="w-full sm:w-1/3 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition text-center cursor-pointer disabled:opacity-60"
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={handleCreateNewTrip}
              disabled={acknowledging}
              className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Trip</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
