"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Fuel,
  Calendar,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User as UserIcon,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { fuelApi, employeesApi, reportsApi } from "@/api";
import { FuelEntry, User } from "@/types";
import { formatCurrency } from "@/lib/calculations";

function AdminFuelContent() {
  const toast = useToast();

  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [entryToDelete, setEntryToDelete] = useState<FuelEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await employeesApi.getEmployees();
        setEmployees(data.employees);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    }
    loadEmployees();
  }, []);

  const fetchFuel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fuelApi.getFuelEntries({
        page,
        limit: 20,
        employeeId: employeeFilter,
        startDate,
        endDate,
      });
      setFuelEntries(data.fuelEntries);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      console.error("Admin fetchFuel error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, employeeFilter, startDate, endDate]);

  useEffect(() => {
    fetchFuel();
  }, [fetchFuel]);

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      setDeleting(true);
      await fuelApi.deleteFuelEntry(entryToDelete.id);
      toast.success("Fuel record deleted successfully.");
      setEntryToDelete(null);
      fetchFuel();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete fuel record.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    try {
      setSavingEdit(true);
      await fuelApi.updateFuelEntry(editingEntry.id, editingEntry);
      toast.success("Changes saved successfully.");
      setEditingEntry(null);
      fetchFuel();
    } catch (err: any) {
      toast.error(err.message || "Failed to update fuel entry.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = () => {
    window.open(reportsApi.getExportCsvUrl("fuel", startDate, endDate), "_blank");
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Fuel className="w-6 h-6 text-amber-600" />
            All Fuel & Expense Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet petrol bills, reimbursement claims, and fuel prices
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
        {/* Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading fuel records...</div>
        ) : fuelEntries.length === 0 ? (
          <div className="p-12 text-center">
            <Fuel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No fuel records found</h3>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Employee</th>
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
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {entry.user?.name}
                      </td>
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
                            <span>Receipt</span>
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
                            onClick={() => setEditingEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit fuel entry"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
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
        isOpen={Boolean(entryToDelete)}
        title="Admin: Delete Fuel Record?"
        message={`Are you sure you want to delete this fuel record (${entryToDelete?.litres}L by ${entryToDelete?.user?.name})?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setEntryToDelete(null)}
      />

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Admin Edit: Fuel Entry</h3>
                <p className="text-xs text-slate-400">Rider: {editingEntry.user?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
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
                  value={new Date(editingEntry.date).toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, date: new Date(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Odometer KM</label>
                <input
                  type="number"
                  value={editingEntry.currentKm}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
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
                    value={editingEntry.litres}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
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
                    value={editingEntry.amount}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
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
                  value={editingEntry.remarks || ""}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, remarks: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editingEntry.litres <= 0 || editingEntry.amount <= 0}
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

export default function AdminFuelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading fuel entries...</div>}>
      <AdminFuelContent />
    </Suspense>
  );
}
