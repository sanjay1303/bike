"use client";

import React, { useState } from "react";
import { Users, CheckCircle, XCircle, Clock, Route, Fuel, Phone, AlertCircle, ArrowRight } from "lucide-react";
import { PendingCoRiderConfirmation } from "@/types";
import { tripsApi } from "@/api";
import { useToast } from "@/components/common/Toast";
import { formatCurrency } from "@/lib/calculations";

interface CoRideConfirmationCardProps {
  requests: PendingCoRiderConfirmation[];
  onActionComplete: () => void;
}

export function CoRideConfirmationCard({
  requests,
  onActionComplete,
}: CoRideConfirmationCardProps) {
  const toast = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!requests || requests.length === 0) return null;

  const handleAction = async (tripId: string, confirmed: boolean) => {
    try {
      setProcessingId(tripId);
      const res = await tripsApi.confirmCoRide(tripId, confirmed);
      if (confirmed) {
        toast.success("Double ride confirmed! Distance & fuel split updated on your dashboard.");
      } else {
        toast.info("Marked ride as Not Confirmed. Primary rider & admin will see this status.");
      }
      onActionComplete();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update confirmation status.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {requests.map((req) => {
        const isProcessing = processingId === req.id;
        const dateStr = new Date(req.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        let fuelSplitLabel = "No Fuel Added";
        if (req.fuelSplitType === "SPLIT_EQUALLY") {
          fuelSplitLabel = `Split 50/50 (Your share: ${formatCurrency(req.coRiderFuelShare)})`;
        } else if (req.fuelSplitType === "PAID_BY_PRIMARY") {
          fuelSplitLabel = `Paid 100% by ${req.primaryRider.name} (₹0 for you)`;
        } else if (req.fuelSplitType === "PAID_BY_CO_RIDER") {
          fuelSplitLabel = `Paid 100% by You (${formatCurrency(req.coRiderFuelShare)})`;
        }

        return (
          <div
            key={req.id}
            className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white border border-indigo-200/80 shadow-md relative overflow-hidden"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Double Ride Confirmation Request
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {req.primaryRider.name} added you as Co-Rider
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Trip Purpose: <strong className="text-slate-900 font-semibold">{req.purpose}</strong>
                  </p>
                </div>
              </div>

              {/* Contact rider pill */}
              <a
                href={`tel:${req.primaryRider.mobile}`}
                className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Call {req.primaryRider.name.split(" ")[0]}</span>
              </a>
            </div>

            {/* Split Details Box */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-white/80 border border-indigo-100 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Route className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Distance Split</span>
                  <span className="font-bold text-slate-900">
                    Your Share: <span className="text-emerald-700">{req.coRiderKm} km</span>{" "}
                    <span className="text-slate-400 font-normal">(Total: {req.distanceKm} km)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-700">
                <Fuel className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Fuel Expense Split</span>
                  <span className="font-bold text-slate-900">{fuelSplitLabel}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-indigo-100/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 text-center sm:text-left">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Did you travel on this ride? Confirming will add your split km to your history.</span>
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction(req.id, false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Not Confirmed</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction(req.id, true)}
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isProcessing ? "Updating..." : "Confirm Ride"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
