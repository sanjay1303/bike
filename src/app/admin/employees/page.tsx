"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  PlusCircle,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  X,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { ConfirmModal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { employeesApi } from "@/api";
import { User } from "@/types";

export default function AdminEmployeesPage() {
  const toast = useToast();

  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    role: "EMPLOYEE",
    status: "ACTIVE",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeesApi.getEmployees();
      setEmployees(data.employees);
    } catch (err) {
      console.error("fetchEmployees error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      role: "EMPLOYEE",
      status: "ACTIVE",
      password: "welcome123",
    });
    setShowPassword(false);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (emp: User) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      mobile: emp.mobile,
      email: emp.email || "",
      role: emp.role,
      status: emp.status,
      password: "",
    });
    setShowPassword(false);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanMobile = formData.mobile.trim().replace(/[^0-9]/g, "");
    if (!formData.name.trim()) {
      setErrorMsg("Please enter the full name.");
      return;
    }
    if (cleanMobile.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!editingEmployee && formData.password && formData.password.trim().length < 6) {
      setErrorMsg("Default password must be at least 6 characters.");
      return;
    }

    if (editingEmployee && formData.password && formData.password.trim().length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    try {
      setSaving(true);
      if (editingEmployee) {
        await employeesApi.updateEmployee(editingEmployee.id, {
          name: formData.name,
          mobile: cleanMobile,
          email: formData.email || null,
          role: formData.role as any,
          status: formData.status as any,
          ...(formData.password && formData.password.trim() ? { password: formData.password.trim() } : {}),
        });
      } else {
        await employeesApi.createEmployee({
          name: formData.name,
          mobile: cleanMobile,
          email: formData.email || null,
          role: formData.role as any,
          status: formData.status as any,
          password: formData.password ? formData.password.trim() : "welcome123",
        });
      }

      toast.success(
        editingEmployee ? "Employee updated successfully." : "Employee created successfully with default password."
      );
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save employee.");
      toast.error(err.message || "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (emp: User) => {
    const newStatus = emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await employeesApi.updateEmployee(emp.id, { status: newStatus });
      toast.success(`Account marked as ${newStatus.toLowerCase()}.`);
      fetchEmployees();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await employeesApi.deleteEmployee(userToDelete.id);
      toast.success("Employee deleted successfully.");
      setUserToDelete(null);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete employee.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Employee Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company authorized riders, admin access, and login statuses
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading staff members...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Petrol Balance</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {employees.map((emp) => {
                  const joined = new Date(emp.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const balance = (emp as any).fuelBalance;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {emp.name.slice(0, 1)}
                          </div>
                          <div>
                            <div>{emp.name}</div>
                            {emp.mustChangePassword && (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-semibold mt-0.5">
                                <KeyRound className="w-2.5 h-2.5" />
                                Must Change Password
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">+91 {emp.mobile}</td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{emp.email || "—"}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            emp.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {emp.status === "ACTIVE" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {balance?.status === "PENDING_PAYMENT" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                            ₹{balance.pendingAmount} Due
                          </span>
                        ) : balance?.status === "EXTRA_BALANCE" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                            +₹{balance.surplusAmount} Extra
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            ₹0 Settled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">{joined}</td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title={emp.status === "ACTIVE" ? "Disable account" : "Activate account"}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete employee"
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
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sanjay Kumar"
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="flex items-center rounded-xl border border-slate-300">
                  <span className="px-3 py-2 bg-slate-50 border-r border-slate-200 text-slate-500 font-semibold rounded-l-xl">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-r-xl font-mono focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sanjay@company.com"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Default / Reset Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{editingEmployee ? "Reset Password (Optional)" : "Default Password *"}</span>
                  </label>
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                    First login requires password change
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingEmployee ? "Leave blank to keep existing password" : "e.g. welcome123"}
                    className="w-full px-3 py-2 pr-10 border rounded-xl font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                    required={!editingEmployee}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {editingEmployee
                    ? "If set, the employee will be forced to change this password on their next login."
                    : "The employee will sign in with this default password and will be prompted to set a new personal password before entering the application."}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Delete Employee Account?"
        message={`Are you sure you want to delete ${userToDelete?.name} (+91 ${userToDelete?.mobile})? This will also remove their associated trip logs.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleting}
        onConfirm={handleDeleteEmployee}
        onClose={() => setUserToDelete(null)}
      />
    </main>
  );
}
