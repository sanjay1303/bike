import { fetchJson } from "./client";
import { User } from "@/types";

export const employeesApi = {
  getEmployees: () =>
    fetchJson<{ employees: User[] }>("/api/admin/employees"),

  createEmployee: (data: {
    name: string;
    mobile: string;
    email?: string | null;
    role?: string;
    status?: string;
    password?: string;
  }) =>
    fetchJson<{ success: boolean; message: string; employee: User }>("/api/admin/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEmployee: (id: string, data: Partial<User> & { password?: string }) =>
    fetchJson<{ success: boolean; message: string; employee: User }>(`/api/admin/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEmployee: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/employees/${id}`, {
      method: "DELETE",
    }),
};
