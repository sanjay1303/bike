"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  PlusCircle,
  Fuel,
  Clock,
  User as UserIcon,
  LayoutGrid,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { authApi } from "@/api";
import { User as UserType } from "@/types";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await authApi.getMe();
        if (res?.user) {
          setUser(res.user);
        }
      } catch (err) {
        console.error("Employee layout auth load error:", err);
      }
    }
    loadUser();
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

  const sidebarLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutGrid,
      isActive: (path: string) => path === "/dashboard",
    },
    {
      href: "/trips/new",
      label: "Add Trip",
      icon: PlusCircle,
      isActive: (path: string) => path.startsWith("/trips"),
    },
    {
      href: "/fuel/new",
      label: "Fuel Entry",
      icon: Fuel,
      isActive: (path: string) => path.startsWith("/fuel"),
    },
    {
      href: "/history",
      label: "My History",
      icon: Clock,
      isActive: (path: string) => path.startsWith("/history"),
    },
    {
      href: "/profile",
      label: "My Profile",
      icon: UserIcon,
      isActive: (path: string) => path.startsWith("/profile"),
    },
  ];

  const firstName = user?.name ? user.name.split(" ")[0] : "Employee";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row antialiased text-slate-800">
      {/* ========================================================================= */}
      {/* DESKTOP LEFT SIDEBAR                                                      */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 p-5 shrink-0 min-h-screen justify-between z-30 sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Logo Branding */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-2 py-3 mb-6 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#E6F7F0] text-[#059669] flex items-center justify-center border border-emerald-200/60 shadow-2xs group-hover:scale-105 transition">
              <Bike className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  BikeTrack
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Track. Manage. Save.
              </p>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = link.isActive(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                    active
                      ? "bg-[#E6F7F0] text-[#059669] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-[#059669]" : "text-slate-400"
                    }`}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Promotional Card (Ride smart. Log every km.) */}
        <div className="mt-8 rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs relative bg-emerald-50 group hover:shadow-md transition">
          <div className="w-full aspect-[4/5] relative">
            <Image
              src="/ride-smart-banner.svg"
              alt="Ride smart. Log every km."
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP NAVIGATION BAR & DRAWER                                        */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E6F7F0] text-[#059669] flex items-center justify-center border border-emerald-200">
              <Bike className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900">BikeTrack</span>
              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                Employee
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer (Attached inside sticky header) */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 px-4 py-3 space-y-1 bg-white animate-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const active = link.isActive(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                    active
                      ? "bg-[#E6F7F0] text-[#059669]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#059669]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                  {firstName.slice(0, 1)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {user?.name || "Employee"}
                  </p>
                  <p className="text-[10px] text-slate-400">Employee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                {loggingOut ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT AREA                                                        */}
      {/* ========================================================================= */}
      <div
        id="dashboard-scroll-container"
        className="flex-1 flex flex-col min-w-0 overflow-y-auto"
      >
        {/* Top Header Bar for Desktop */}
        <header className="hidden md:flex items-center justify-end px-8 pt-5 pb-3">
          <div className="flex items-center gap-4">
            {/* Notification Bell with red dot */}
            <button
              type="button"
              className="relative p-2.5 rounded-full text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition shadow-2xs cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            {/* User Profile Pill & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#135D43] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {firstName.slice(0, 1)}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.name || "Employee"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Employee
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs font-semibold animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-800">
                      {user?.name || "Employee"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      +91 {user?.mobile || "---"}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Child Pages Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
