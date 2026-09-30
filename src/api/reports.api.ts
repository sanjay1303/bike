import { fetchJson } from "./client";
import { EmployeeDashboardData, AdminDashboardData } from "@/types";

export const reportsApi = {
  getEmployeeDashboard: () =>
    fetchJson<EmployeeDashboardData>("/api/dashboard"),

  getAdminDashboard: (range = "all") =>
    fetchJson<AdminDashboardData>(`/api/admin/dashboard?range=${range}`),

  getAuditLogs: () =>
    fetchJson<{ logs: any[] }>("/api/admin/audit"),

  getExportCsvUrl: (type: "trips" | "fuel" | "employee_summary", startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return `/api/reports/export-csv?${params.toString()}`;
  },
};
