"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  History as HistoryIcon,
  Bike,
  Fuel,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  Users,
  User,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { tripsApi, fuelApi } from "@/api";
import { Trip, FuelEntry } from "@/types";
import { formatCurrency, formatKm } from "@/lib/calculations";

const PURPOSES = [
  "ALL",
  "Office Work",
  "Client Visit",
  "Site Visit",
  "Bank",
  "Meeting",
  "Market",
  "Personal/Other",
];

function HistoryContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"trips" | "fuel">("trips");

  // Trips State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripPage, setTripPage] = useState(1);
  const [tripTotalPages, setTripTotalPages] = useState(1);
  const [tripSearch, setTripSearch] = useState("");
  const [tripPurpose, setTripPurpose] = useState("ALL");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");

  // Fuel State
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [fuelPage, setFuelPage] = useState(1);
  const [fuelTotalPages, setFuelTotalPages] = useState(1);
  const [fuelStartDate, setFuelStartDate] = useState("");
  const [fuelEndDate, setFuelEndDate] = useState("");

  const [loading, setLoading] = useState(true);

  // Deletion Modal State
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: "trip" | "fuel"; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch Trips
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getTrips({
        page: tripPage,
        limit: 15,
        search: tripSearch,
        purpose: tripPurpose,
        startDate: tripStartDate,
        endDate: tripEndDate,
      });
      setTrips(data.trips);
      setTripTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      console.error("fetchTrips error:", err);
    } finally {
      setLoading(false);
    }
  }, [tripPage, tripSearch, tripPurpose, tripStartDate, tripEndDate]);

  // Fetch Fuel
  const fetchFuel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fuelApi.getFuelEntries({
        page: fuelPage,
        limit: 15,
        startDate: fuelStartDate,
        endDate: fuelEndDate,
      });
      setFuelEntries(data.fuelEntries);
      setFuelTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      console.error("fetchFuel error:", err);
    } finally {
      setLoading(false);
    }
  }, [fuelPage, fuelStartDate, fuelEndDate]);

  useEffect(() => {
    if (activeTab === "trips") {
      fetchTrips();
    } else {
      fetchFuel();
    }
  }, [activeTab, fetchTrips, fetchFuel]);

  // Handle URL edit trip param if passed from dashboard
  useEffect(() => {
    const editTripId = searchParams.get("editTrip");
    if (editTripId && trips.length > 0) {
      const match = trips.find((t) => t.id === editTripId);
      if (match) setEditingTrip(match);
    }
  }, [searchParams, trips]);

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setDeleting(true);
      if (itemToDelete.type === "trip") {
        await tripsApi.deleteTrip(itemToDelete.id);
      } else {
        await fuelApi.deleteFuelEntry(itemToDelete.id);
      }

      toast.success(
        itemToDelete.type === "trip" ? "Trip deleted successfully." : "Fuel entry deleted successfully."
      );
      setItemToDelete(null);
      if (itemToDelete.type === "trip") fetchTrips();
      else fetchFuel();
    } catch (err: any) {
      toast.error(err.message || "Network error while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  // Save Trip Edit
  const handleSaveTripEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    try {
      setSavingEdit(true);
      await tripsApi.updateTrip(editingTrip.id, editingTrip);
      toast.success("Changes saved successfully.");
      setEditingTrip(null);
      fetchTrips();
    } catch (err: any) {
      toast.error(err.message || "Failed to update trip.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Save Fuel Edit
  const handleSaveFuelEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuel) return;
    try {
      setSavingEdit(true);
      await fuelApi.updateFuelEntry(editingFuel.id, editingFuel);
      toast.success("Changes saved successfully.");
      setEditingFuel(null);
      fetchFuel();
    } catch (err: any) {
      toast.error(err.message || "Failed to update fuel entry.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Page Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-emerald-600" />
              My History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Filter, review, and manage your personal bike records</p>
          </div>

          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("trips")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === "trips"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>My Trips</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fuel")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === "fuel"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>My Fuel Entries</span>
            </button>
          </div>
        </div>

        {/* Tab 1: My Trips */}
        {activeTab === "trips" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Filters Row */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search purpose or notes..."
                  value={tripSearch}
                  onChange={(e) => {
                    setTripSearch(e.target.value);
                    setTripPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Purpose Filter */}
              <div className="relative">
                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={tripPurpose}
                  onChange={(e) => {
                    setTripPurpose(e.target.value);
                    setTripPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p === "ALL" ? "All Purposes" : p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={tripStartDate}
                  onChange={(e) => {
                    setTripStartDate(e.target.value);
                    setTripPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                  title="Filter from date"
                />
              </div>

              {/* End Date */}
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={tripEndDate}
                  onChange={(e) => {
                    setTripEndDate(e.target.value);
                    setTripPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                  title="Filter to date"
                />
              </div>
            </div>

            {/* Trips List / Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className="p-12 text-center">
                <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No trips found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Starting KM</th>
                      <th className="py-3.5 px-4">Ending KM</th>
                      <th className="py-3.5 px-4">Distance</th>
                      <th className="py-3.5 px-4">Type / Riders</th>
                      <th className="py-3.5 px-4">Purpose</th>
                      <th className="py-3.5 px-4">Remarks</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {trips.map((trip) => {
                      const dateStr = new Date(trip.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <tr key={trip.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">{dateStr}</td>
                          <td className="py-3.5 px-4 font-mono">{trip.startingKm.toLocaleString("en-IN")}</td>
                          <td className="py-3.5 px-4 font-mono">{trip.endingKm.toLocaleString("en-IN")}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                              {trip.distanceKm} km
                            </span>
                            {trip.isDoubleRide && (
                              <span className="block text-[10px] text-indigo-600 font-semibold mt-0.5 whitespace-nowrap">
                                Split: ~{Math.round(trip.distanceKm / 2)} km
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {trip.isDoubleRide ? (
                              <div className="space-y-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  trip.coRiderConfirmation === "CONFIRMED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                }`}>
                                  <Users className="w-2.5 h-2.5" />
                                  Double Ride
                                </span>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {trip.coRider?.name ? `with ${trip.coRider.name}` : "Co-rider"} &bull;{" "}
                                  <span className={
                                    trip.coRiderConfirmation === "CONFIRMED"
                                      ? "text-emerald-700 font-bold"
                                      : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                      ? "text-rose-600 font-bold"
                                      : "text-indigo-600 font-bold"
                                  }>
                                    {trip.coRiderConfirmation === "CONFIRMED"
                                      ? "Confirmed"
                                      : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                      ? "Not Confirmed"
                                      : "Pending"}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                <User className="w-2.5 h-2.5" /> Solo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">{trip.purpose}</td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                            {trip.remarks || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingTrip(trip)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit trip"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setItemToDelete({
                                    id: trip.id,
                                    type: "trip",
                                    name: `${trip.distanceKm} km for ${trip.purpose}`,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete trip"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {tripTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {tripPage} of {tripTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                    disabled={tripPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripPage((p) => Math.min(tripTotalPages, p + 1))}
                    disabled={tripPage >= tripTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Fuel Entries */}
        {activeTab === "fuel" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Filters Row */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={fuelStartDate}
                  onChange={(e) => {
                    setFuelStartDate(e.target.value);
                    setFuelPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                  title="Filter from date"
                />
              </div>

              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={fuelEndDate}
                  onChange={(e) => {
                    setFuelEndDate(e.target.value);
                    setFuelPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                  title="Filter to date"
                />
              </div>
            </div>

            {/* Fuel List / Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading fuel entries...</div>
            ) : fuelEntries.length === 0 ? (
              <div className="p-12 text-center">
                <Fuel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No fuel entries found</h3>
                <p className="text-xs text-slate-500 mt-1">Add your first fuel entry to start tracking expenses.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Odometer</th>
                      <th className="py-3.5 px-4">Litres</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Price / Litre</th>
                      <th className="py-3.5 px-4">Receipt</th>
                      <th className="py-3.5 px-4">Remarks</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {fuelEntries.map((entry) => {
                      const dateStr = new Date(entry.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap">{dateStr}</td>
                          <td className="py-3.5 px-4 font-mono">{entry.currentKm.toLocaleString("en-IN")} km</td>
                          <td className="py-3.5 px-4 font-semibold text-amber-700">{entry.litres} L</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{formatCurrency(entry.amount)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">₹{entry.pricePerLitre}/L</td>
                          <td className="py-3.5 px-4">
                            {entry.billImageUrl ? (
                              <a
                                href={entry.billImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                              >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                            {entry.remarks || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingFuel(entry)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit fuel entry"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setItemToDelete({
                                    id: entry.id,
                                    type: "fuel",
                                    name: `${entry.litres}L fuel (₹${entry.amount})`,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete fuel entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {fuelTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Page {fuelPage} of {fuelTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFuelPage((p) => Math.max(1, p - 1))}
                    disabled={fuelPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFuelPage((p) => Math.min(fuelTotalPages, p + 1))}
                    disabled={fuelPage >= fuelTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title={itemToDelete?.type === "trip" ? "Delete this trip?" : "Delete this fuel entry?"}
        message={`Are you sure you want to delete ${itemToDelete?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setItemToDelete(null)}
      />

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Trip</h3>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTripEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={new Date(editingTrip.date).toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setEditingTrip({ ...editingTrip, date: new Date(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Starting KM</label>
                  <input
                    type="number"
                    value={editingTrip.startingKm}
                    onChange={(e) =>
                      setEditingTrip({
                        ...editingTrip,
                        startingKm: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ending KM</label>
                  <input
                    type="number"
                    value={editingTrip.endingKm}
                    onChange={(e) =>
                      setEditingTrip({
                        ...editingTrip,
                        endingKm: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  value={editingTrip.purpose}
                  onChange={(e) =>
                    setEditingTrip({ ...editingTrip, purpose: e.target.value })
                  }
                  placeholder="Enter trip purpose..."
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingTrip.remarks || ""}
                  onChange={(e) =>
                    setEditingTrip({ ...editingTrip, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editingTrip.endingKm < editingTrip.startingKm}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fuel Modal */}
      {editingFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Fuel Entry</h3>
              <button
                type="button"
                onClick={() => setEditingFuel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFuelEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={new Date(editingFuel.date).toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setEditingFuel({ ...editingFuel, date: new Date(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Odometer KM</label>
                <input
                  type="number"
                  value={editingFuel.currentKm}
                  onChange={(e) =>
                    setEditingFuel({
                      ...editingFuel,
                      currentKm: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Litres</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFuel.litres}
                    onChange={(e) =>
                      setEditingFuel({
                        ...editingFuel,
                        litres: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingFuel.amount}
                    onChange={(e) =>
                      setEditingFuel({
                        ...editingFuel,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingFuel.remarks || ""}
                  onChange={(e) =>
                    setEditingFuel({ ...editingFuel, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFuel(null)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editingFuel.litres <= 0 || editingFuel.amount <= 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading history...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
