"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  PlusCircle,
  Fuel,
  History,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "./Toast";

interface HeaderProps {
  userRole?: "ADMIN" | "EMPLOYEE";
  userName?: string;
}

export function Header({ userRole = "EMPLOYEE", userName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        toast.success("Logged out successfully");
        router.push("/login");
        router.refresh();
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch {
      toast.error("Network error during logout");
    } finally {
      setLoggingOut(false);
    }
  };

  const employeeLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trips/new", label: "Add Trip", icon: PlusCircle },
    { href: "/fuel/new", label: "Fuel Entry", icon: Fuel },
    { href: "/history", label: "My History", icon: History },
    { href: "/profile", label: "My Profile", icon: UserIcon },
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/trips", label: "Trip Records", icon: Bike },
    { href: "/admin/fuel", label: "Fuel Records", icon: Fuel },
    { href: "/admin/employees", label: "Employees", icon: Users },
    { href: "/admin/bike", label: "Bike Details", icon: Settings },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/settings", label: "Settings", icon: ShieldCheck },
  ];

  const links = userRole === "ADMIN" ? adminLinks : employeeLinks;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            href={userRole === "ADMIN" ? "/admin/dashboard" : "/dashboard"}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 tracking-tight">BikeTrack</span>
                {userRole === "ADMIN" && (
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none hidden sm:block">
                Track. Manage. Save.
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            {userName && (
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">{userName}</span>
                <span className="text-[10px] text-slate-500 capitalize">{userRole.toLowerCase()}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition"
              title="Logout from account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{loggingOut ? "Logging out..." : "Logout"}</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                const nextState = !mobileMenuOpen;
                setMobileMenuOpen(nextState);
                if (nextState) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150">
          {userName && (
            <div className="px-3 py-2 border-b border-slate-100 mb-2">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="text-sm font-semibold text-slate-800">{userName}</p>
            </div>
          )}
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
