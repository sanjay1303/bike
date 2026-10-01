"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, ArrowRight, Shield, Sparkles, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { authApi } from "@/api";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanMobile = mobile.trim().replace(/[^0-9]/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter your account password.");
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login(cleanMobile, password);

      if (res.user.mustChangePassword) {
        toast.info("Default password detected. Please set your new password to enter.");
        window.location.href = "/change-password";
      } else {
        toast.success(`Welcome back, ${res.user.name}!`);
        const dest = res.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
        window.location.href = dest;
      }
    } catch (err: any) {
      const msg = err.message || "Invalid mobile number or password.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Brand & Visual */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              Company Bike Tracking
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-lg">
                <Bike className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">BikeTrack</h1>
            </div>

            <p className="text-emerald-100 text-sm font-medium italic mb-6">
              &ldquo;Track usage, control fuel expenses, together.&rdquo;
            </p>

            {/* Motorcycle graphic illustration */}
            <div className="my-6 p-6 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 shadow-inner flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center mb-3">
                <Bike className="w-12 h-12 text-white animate-pulse" />
              </div>
              <p className="text-xs text-emerald-100 font-medium text-center max-w-xs">
                Accurate odometer logging, transparent fuel accountability, and real-time fleet analytics.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              Encrypted Password Auth
            </span>
            <span>Tagline: &ldquo;Track. Manage. Save.&rdquo;</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your phone number and password to access BikeTrack</p>
          </div>

          {errorMsg && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium animate-in fade-in"
              role="alert"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Phone Number Field */}
            <div>
              <label htmlFor="mobile" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition bg-white shadow-2xs">
                <span className="px-3.5 py-3 text-sm font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 rounded-l-xl select-none flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +91
                </span>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden rounded-r-xl"
                  autoComplete="tel"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">10-digit registered company mobile number.</p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition bg-white shadow-2xs">
                <span className="px-3.5 py-3 text-sm font-semibold text-slate-500 bg-slate-50 border-r border-slate-200 rounded-l-xl select-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3.5 py-3 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || mobile.length !== 10 || !password}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In...
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </main>
  );
}
