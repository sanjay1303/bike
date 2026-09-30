"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Shield,
  Bike,
  Calendar,
  LogOut,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { authApi, bikeApi } from "@/api";
import { User as UserType, Bike as BikeType } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [bike, setBike] = useState<BikeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const [meData, bikeData] = await Promise.all([
          authApi.getMe(),
          bikeApi.getBike(),
        ]);
        if (meData.user) {
          setUser(meData.user);
        }
        if (bikeData.bike) {
          setBike(bikeData.bike);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await authApi.logout();
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    } finally {
      setLoggingOut(false);
    }
  };

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
    } catch (err: any) {
      const msg = err.message || "Failed to change password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-3xl w-full mx-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {user?.name.slice(0, 1) || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{user?.name}</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Company Authorized Rider</p>
            </div>
          </div>

          <div className="py-6 space-y-4 text-xs font-medium divide-y divide-slate-100">
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-500 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Mobile Number
              </span>
              <span className="font-mono font-semibold text-slate-900">+91 {user?.mobile}</span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                Email Address
              </span>
              <span className="text-slate-900">{user?.email || "Not specified"}</span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-slate-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                Account Status
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className="text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Joined On
              </span>
              <span className="text-slate-700">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—"}
              </span>
            </div>
          </div>

          {/* Assigned Bike Widget */}
          {bike && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white text-emerald-600 shadow-2xs">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {bike.name} ({bike.registrationNumber})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Odometer: {bike.currentKm.toLocaleString("en-IN")} km &bull; Fuel: {bike.fuelType}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Update your login password to keep your account secure</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4 text-xs">
            {passwordSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {passwordError}
              </div>
            )}

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
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showNew ? "Hide" : "Show"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters long.</p>
            </div>

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
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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

        {/* Logout Button */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full py-3 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </main>
  );
}
