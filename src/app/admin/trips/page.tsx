"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Bike,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Users,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { tripsApi, employeesApi, reportsApi } from "@/api";
import { Trip, User } from "@/types";

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

function AdminTripsContent() {
  const toast = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Load employees for filter dropdown
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await employeesApi.getEmployees();
        setEmployees(data.employees);
      } catch (err) {
        console.error("Failed to load employees for filter:", err);
      }
    }
    loadEmployees();
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tripsApi.getTrips({
        page,
        limit: 20,
        search,
        employeeId: employeeFilter,
        purpose: purposeFilter,
        startDate,
        endDate,
      });
      setTrips(data.trips);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      console.error("Admin fetchTrips error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, employeeFilter, purposeFilter, startDate, endDate]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    try {
      setDeleting(true);
      await tripsApi.deleteTrip(tripToDelete.id);
      toast.success("Trip deleted successfully.");
      setTripToDelete(null);
      fetchTrips();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete trip.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
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

  const handleExportCsv = () => {
    window.open(reportsApi.getExportCsvUrl("trips", startDate, endDate), "_blank");
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="w-6 h-6 text-emerald-600" />
            All Company Trips
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete odometer journey records logged by all employees
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filters Grid */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search rider or purpose..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Employee Filter */}
          <div className="relative">
            <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={purposeFilter}
              onChange={(e) => {
                setPurposeFilter(e.target.value);
                setPage(1);
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
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
              title="From date"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
              title="To date"
            />
          </div>
        </div>

        {/* Trips Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="p-12 text-center">
            <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No trips found</h3>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Starting KM</th>
                  <th className="py-3.5 px-4">Ending KM</th>
                  <th className="py-3.5 px-4">Distance</th>
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
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{trip.user?.name}</div>
                        {trip.isDoubleRide && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px]">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md font-bold border ${
                              trip.coRiderConfirmation === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}>
                              <Users className="w-2.5 h-2.5" />
                              +{trip.coRider?.name || "Co-rider"} ({
                                trip.coRiderConfirmation === "CONFIRMED"
                                  ? "Confirmed"
                                  : trip.coRiderConfirmation === "NOT_CONFIRMED"
                                  ? "Not Confirmed"
                                  : "Pending"
                              })
                            </span>
                          </div>
                        )}
                      </td>
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
                            onClick={() => setTripToDelete(trip)}
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
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(tripToDelete)}
        title="Admin: Delete Trip Record?"
        message={`Are you sure you want to delete this trip (${tripToDelete?.distanceKm} km by ${tripToDelete?.user?.name})? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteTrip}
        onClose={() => setTripToDelete(null)}
      />

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Admin Edit: Trip Record</h3>
                <p className="text-xs text-slate-400">Rider: {editingTrip.user?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
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
                    step="any"
                    value={editingTrip.startingKm}
                    onChange={(e) =>
                      setEditingTrip({
                        ...editingTrip,
                        startingKm: parseFloat(e.target.value) || 0,
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
                    step="any"
                    value={editingTrip.endingKm}
                    onChange={(e) =>
                      setEditingTrip({
                        ...editingTrip,
                        endingKm: parseFloat(e.target.value) || 0,
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
                  disabled={savingEdit || editingTrip.endingKm <= editingTrip.startingKm}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminTripsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading trips...</div>}>
      <AdminTripsContent />
    </Suspense>
  );
}
