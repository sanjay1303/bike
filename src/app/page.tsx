import Link from "next/link";
import { Bike, Shield, Gauge, Fuel, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">BikeTrack</span>
              <p className="text-[10px] text-slate-500 font-medium leading-none">Track. Manage. Save.</p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-6 border border-emerald-200 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Next-Generation Fleet & Petrol Management</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-tight">
          Track Company Bike Usage & Control Petrol Expenses.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 mt-5 max-w-2xl leading-relaxed">
          Replace outdated paper registers and messy spreadsheets with a fast, mobile-friendly tracking application built for your team.
        </p>

        {/* Call to action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl transition"
          >
            <span>Access BikeTrack Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Accurate Odometer Math</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Auto-calculates trip distance from starting and ending kilometers with instant odometer checks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Fuel & Receipt Auditing</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log petrol quantity, amount, and upload bill receipts. Computes exact price per litre and bike mileage.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Ironclad RBAC Security</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Employees can only access and edit their own trips. Admins have comprehensive management oversight.
            </p>
          </div>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-12 p-4 rounded-2xl bg-white border border-slate-200 max-w-lg w-full text-xs text-slate-600">
          <div className="font-bold text-slate-900 mb-1 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Quick Demo Accounts Ready:
          </div>
          <div className="flex justify-around pt-1 text-slate-700">
            <span>Admin: <strong className="font-mono text-emerald-700">9999999999</strong></span>
            <span>Employee: <strong className="font-mono text-emerald-700">8888888888</strong></span>
            <span>Dev OTP: <strong className="font-mono text-amber-700">123456</strong></span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} BikeTrack &bull; &ldquo;Track. Manage. Save.&rdquo;</p>
      </footer>
    </div>
  );
}
