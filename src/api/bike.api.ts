import { fetchJson } from "./client";
import { Bike } from "@/types";

export const bikeApi = {
  getBike: () => fetchJson<{ bike: Bike }>("/api/bike"),

  updateBike: (data: Partial<Bike>) =>
    fetchJson<{ success: boolean; message: string; bike: Bike }>("/api/bike", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
