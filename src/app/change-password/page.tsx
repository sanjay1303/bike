"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { authApi } from "@/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("EMPLOYEE");

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await authApi.getMe();
        if (me && me.user) {
          setUserName(me.user.name);
          setUserRole(me.user.role || "EMPLOYEE");
          // If the user does not need to change password, redirect them immediately to dashboard
          if (!me.user.mustChangePassword) {
            router.replace(me.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
          }
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentPassword) {
      setErrorMsg("Please enter your current/default password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg("New password must be different from your current default password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully! Welcome to BikeTrack.");
      // Redirect into application
      router.replace(userRole === "ADMIN" ? "/admin/dashboard" : "/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password. Please check your credentials.");
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isDifferent = newPassword.length > 0 && newPassword !== currentPassword;
  const isMatched = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 text-slate-800 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 mb-3">
          <Bike className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">BikeTrack</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Company Fleet & Petrol Tracker</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {/* Header Tag */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-950 mb-6 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Mandatory Password Setup</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {userName ? `Hi ${userName}, you` : "You"} signed in using an initial default password. For your security, you must set a private password before entering the application.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Default Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Current / Default Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current default password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                New Personal Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden bg-white shadow-2xs pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                <span className={isMinLength ? "text-emerald-800" : "text-slate-500"}>Minimum 6 characters</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isDifferent ? "text-emerald-600" : "text-slate-300"}`} />
                <span className={isDifferent ? "text-emerald-800" : "text-slate-500"}>Different from default password</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMatched ? "text-emerald-600" : "text-slate-300"}`} />
                <span className={isMatched ? "text-emerald-800" : "text-slate-500"}>Passwords match</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                "Updating Password..."
              ) : (
                <>
                  <span>Save Password & Enter App</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign Out Option */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Wrong account?</span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
