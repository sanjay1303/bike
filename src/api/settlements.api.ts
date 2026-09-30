import { fetchJson } from "./client";

export interface SettlementInput {
  userId: string;
  amount: number;
  type: "COLLECTED_FROM_EMPLOYEE" | "REIMBURSED_TO_EMPLOYEE" | "BALANCE_CLEAR";
  notes?: string;
}

export const settlementsApi = {
  list: (userId?: string) => {
    const url = userId ? `/api/admin/settlements?userId=${userId}` : "/api/admin/settlements";
    return fetchJson<{ settlements: any[] }>(url);
  },

  create: (data: SettlementInput) =>
    fetchJson<{ success: boolean; settlement: any }>("/api/admin/settlements", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
