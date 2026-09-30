import { fetchJson } from "./client";

export const authApi = {
  login: (mobile: string, password: string) =>
    fetchJson<{ success: boolean; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ mobile, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchJson<{ success: boolean; message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  sendOtp: (mobile: string) =>
    fetchJson<{ success: boolean; message: string; devOtp?: string }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  verifyOtp: (mobile: string, code: string) =>
    fetchJson<{ success: boolean; user: any }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, code }),
    }),

  getMe: () =>
    fetchJson<{ authenticated: boolean; user: any }>("/api/auth/me"),

  logout: () =>
    fetchJson<{ success: boolean; message: string }>("/api/auth/logout", {
      method: "POST",
    }),
};
