import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/common/Toast";

export const metadata: Metadata = {
  title: "BikeTrack - Track. Manage. Save.",
  description: "Company Bike & Fuel Expense Tracking System for Modern Teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
