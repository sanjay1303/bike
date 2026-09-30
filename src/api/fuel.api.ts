import { fetchJson } from "./client";
import { FuelEntry } from "@/types";

export interface FuelResponse {
  fuelEntries: FuelEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  mileageStats: {
    totalKm: number;
    totalLitres: number;
    mileage: number | null;
    canCalculate: boolean;
  };
}

export const fuelApi = {
  getFuelEntries: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== "") query.set(key, String(val));
      });
    }
    return fetchJson<FuelResponse>(`/api/fuel?${query.toString()}`);
  },

  getFuelEntry: (id: string) =>
    fetchJson<{ fuelEntry: FuelEntry }>(`/api/fuel/${id}`),

  createFuelEntry: (formDataOrJson: FormData | Record<string, any>) => {
    if (formDataOrJson instanceof FormData) {
      return fetchJson<{ success: boolean; fuelEntry: FuelEntry }>("/api/fuel", {
        method: "POST",
        body: formDataOrJson,
      });
    }
    return fetchJson<{ success: boolean; fuelEntry: FuelEntry }>("/api/fuel", {
      method: "POST",
      body: JSON.stringify(formDataOrJson),
    });
  },

  updateFuelEntry: (id: string, data: Partial<FuelEntry>) =>
    fetchJson<{ success: boolean; fuelEntry: FuelEntry }>(`/api/fuel/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteFuelEntry: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/fuel/${id}`, {
      method: "DELETE",
    }),
};
