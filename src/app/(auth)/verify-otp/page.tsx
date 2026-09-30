"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bike, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/common/Toast";

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const mobileParam = searchParams.get("mobile") || "";
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Focus first input box on load
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    setErrorMsg("");
    const cleaned = value.replace(/[^0-9]/g, "");

    // Handle paste of multiple digits
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split("");
      const newDigits = [...digits];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = digits.join("");

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (otpCode.length !== 6) {
      setErrorMsg("Please enter all 6 digits of the OTP.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobileParam,
          code: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "The OTP you entered is incorrect.");
        toast.error(data.error || "Invalid OTP.");
        return;
      }

      toast.success(`Welcome back, ${data.user.name}!`);

      if (data.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      toast.error("Network error during verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setErrorMsg("");
    try {
      setResending(true);
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileParam }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to resend OTP.");
        return;
      }

      toast.success("New OTP sent!");
      setSecondsLeft(45);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setErrorMsg("Could not resend OTP.");
    } finally {
      setResending(false);
    }
  };

  // Masked mobile string: +91 XXXXX 12345
  const maskedMobile =
    mobileParam.length === 10
      ? `+91 ${mobileParam.slice(0, 5)} ${mobileParam.slice(5)}`
      : "+91 " + mobileParam;

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/login" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:bg-emerald-700 transition">
            <Bike className="w-7 h-7" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify your account</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the 6-digit OTP sent to:
        </p>
        <p className="text-sm font-semibold text-slate-800 tracking-wide mt-0.5">{maskedMobile}</p>
      </div>

      {/* Dev OTP Callout */}
      <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
        <span className="font-medium">Development Mode OTP:</span>
        <button
          type="button"
          onClick={() => {
            setDigits(["1", "2", "3", "4", "5", "6"]);
            setErrorMsg("");
          }}
          className="px-2 py-1 rounded bg-amber-200/80 hover:bg-amber-300 font-mono font-bold text-amber-950 transition cursor-pointer"
          title="Click to fill 123456"
        >
          123456 (Auto Fill)
        </button>
      </div>

      {errorMsg && (
        <div
          className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-start gap-2 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 6 Digit Inputs */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-between gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-xl border ${
                digit
                  ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 ring-2 ring-emerald-200"
                  : "border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              } focus:outline-hidden transition shadow-2xs`}
              aria-label={`Digit ${idx + 1}`}
              required
            />
          ))}
        </div>

        {/* Countdown & Resend */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div>
            {secondsLeft > 0 ? (
              <span className="font-mono text-slate-600 font-medium">
                00:{secondsLeft.toString().padStart(2, "0")}
              </span>
            ) : (
              <span className="text-amber-600 font-medium">OTP expired</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0 || resending}
            className="font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            Resend OTP
          </button>
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={loading || otpCode.length !== 6}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </span>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Verify</span>
            </>
          )}
        </button>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change mobile number
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading verification...</div>}>
        <OtpVerificationContent />
      </Suspense>
    </main>
  );
}
