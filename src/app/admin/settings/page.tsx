"use client";

import React, { useState, useEffect } from "react";
import { Settings, Shield, Database, Lock, Key, CheckCircle, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { reportsApi, authApi } from "@/api";

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user?: {
    name: string;
    mobile: string;
    role: string;
  };
}

export default function AdminSettingsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getAuditLogs();
      setLogs(data.logs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    try {
      setSavingPassword(true);
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || "Password changed successfully!");
      toast.success(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Refresh audit logs to reflect password change event
      fetchLogs();
    } catch (err: any) {
      const msg = err.message || "Failed to change password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          Application Settings & Security
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          System operational status, administrator credentials management, and audit log history
        </p>
      </div>

      {/* Security & Config Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Password Authentication</span>
          </div>
          <p className="text-slate-500">
            Secured via <strong>bcrypt salted hashing</strong> and HttpOnly JWT cookie sessions.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Active & Enforced</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Database Architecture</span>
          </div>
          <p className="text-slate-500">
            Zero-friction local SQLite (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">dev.db</code>) managed via Prisma ORM with full ACID relational compliance.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Connected & Healthy</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Lock className="w-4 h-4 text-purple-600" />
            <span>Session Protection</span>
          </div>
          <p className="text-slate-500">
            Signed JWT tokens stored in <strong>HttpOnly Lax Cookies</strong>. Client scripts cannot access or alter roles.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Enforced on All Routes</span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Change Account Password</h2>
            <p className="text-xs text-slate-500">Update your current administrator password to keep your account safe</p>
          </div>
        </div>

        <div className="p-6 max-w-xl">
          {passwordSuccess && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {/* Current Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden pr-10 text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden pr-10 text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showNew ? "Hide" : "Show"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters long.</p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden pr-10 text-slate-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  title={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{savingPassword ? "Updating Password..." : "Update Password"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              System Audit Logs
            </h2>
            <p className="text-xs text-slate-400">Chronological history of security events, logins, and mutations</p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No audit logs recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {logs.map((log) => {
                  const time = new Date(log.createdAt).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{time}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {log.user?.name || "System"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.entityType}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                        {log.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
