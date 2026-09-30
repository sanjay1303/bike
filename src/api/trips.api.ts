import { fetchJson } from "./client";
import { Trip } from "@/types";

export interface TripsResponse {
  trips: Trip[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export const tripsApi = {
  getTrips: (params?: Record<string, string | number>) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== "") query.set(key, String(val));
      });
    }
    return fetchJson<TripsResponse>(`/api/trips?${query.toString()}`);
  },

  getTrip: (id: string) =>
    fetchJson<{ trip: Trip }>(`/api/trips/${id}`),

  createTrip: (data: {
    startingKm: number;
    endingKm: number;
    purpose: string;
    remarks?: string | null;
    date?: string | Date;
    hasFuelEntry?: boolean;
    startOdometerPhoto?: string | null;
    endOdometerPhoto?: string | null;
    startReadingMethod?: "PHOTO" | "MANUAL";
    endReadingMethod?: "PHOTO" | "MANUAL";
    startOcrConfidence?: number | null;
    endOcrConfidence?: number | null;
    fuel?: {
      litres?: number;
      amount?: number;
      pricePerLitre?: number;
      remarks?: string | null;
      billImageUrl?: string | null;
    };
  }) =>
    fetchJson<{ success: boolean; trip: Trip }>("/api/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTrip: (id: string, data: Partial<Trip>) =>
    fetchJson<{ success: boolean; trip: Trip }>(`/api/trips/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  startTrip: (data: {
    startingKm: number;
    purpose: string;
    remarks?: string | null;
    startOdometerPhoto?: string | null;
    startReadingMethod?: "PHOTO" | "MANUAL";
    startOcrConfidence?: number | null;
    isDoubleRide?: boolean;
    coRiderId?: string | null;
    fuelSplitType?: string;
  }) =>
    fetchJson<{ success: boolean; trip: Trip }>("/api/trips/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  endTrip: (data: {
    tripId?: string;
    endingKm: number;
    remarks?: string | null;
    hasFuelEntry?: boolean;
    endOdometerPhoto?: string | null;
    endReadingMethod?: "PHOTO" | "MANUAL";
    endOcrConfidence?: number | null;
    fuel?: {
      litres?: number;
      amount?: number;
      pricePerLitre?: number;
      remarks?: string | null;
      billImageUrl?: string | null;
      fuelSplitType?: string;
    };
  }) =>
    fetchJson<{ success: boolean; trip: Trip }>("/api/trips/end", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmCoRide: (tripId: string, confirmed: boolean) =>
    fetchJson<{ success: boolean; status: string; trip: Trip }>(`/api/trips/${tripId}/confirm-co-ride`, {
      method: "POST",
      body: JSON.stringify({ confirmed }),
    }),

  getCoRiders: () =>
    fetchJson<{ coRiders: Array<{ id: string; name: string; mobile: string }> }>("/api/employees/co-riders"),

  forceReleaseBike: (tripId: string, endingKm?: number) =>
    fetchJson<{ success: boolean; message: string }>("/api/trips/force-end", {
      method: "POST",
      body: JSON.stringify({ tripId, endingKm }),
    }),

  getLiveBikeStatus: () =>
    fetchJson<{ success: boolean; status: import("@/types").BikeLiveStatus }>("/api/bike/live-status"),

  deleteTrip: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/trips/${id}`, {
      method: "DELETE",
    }),
};
