import { bikeRepository } from "@/repositories/bike.repository";
import { auditRepository } from "@/repositories/audit.repository";
import { ValidationError, NotFoundError, ForbiddenError } from "@/core/errors";
import { UserSession } from "@/lib/auth";

export class BikeService {
  async getPrimaryBike() {
    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found.");
    }
    return bike;
  }

  async updateBikeDetails(session: UserSession, data: {
    name?: string;
    registrationNumber?: string;
    currentKm?: number;
    fuelType?: string;
    mileageTarget?: number;
    fuelPrice?: number;
    status?: string;
  }) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can modify company bike details and petrol rate.");
    }

    const existing = await bikeRepository.getPrimaryBike();
    if (!existing) {
      throw new NotFoundError("No bike record to update.");
    }

    const newKm = data.currentKm !== undefined ? parseInt(data.currentKm as any, 10) : existing.currentKm;

    // Rule 10: The current bike KM should never decrease
    if (newKm < existing.currentKm) {
      throw new ValidationError(
        `Current KM cannot decrease. Existing odometer is ${existing.currentKm} km.`
      );
    }

    const fuelPrice = data.fuelPrice !== undefined ? parseFloat(data.fuelPrice as any) : existing.fuelPrice;
    if (isNaN(fuelPrice) || fuelPrice <= 0) {
      throw new ValidationError("Petrol rate per litre must be greater than zero.");
    }

    const updated = await bikeRepository.updateBike(existing.id, {
      name: data.name?.trim() || existing.name,
      registrationNumber: (data.registrationNumber || existing.registrationNumber).trim().toUpperCase(),
      currentKm: newKm,
      fuelType: data.fuelType?.trim() || existing.fuelType,
      mileageTarget: data.mileageTarget !== undefined ? parseFloat(data.mileageTarget as any) : existing.mileageTarget,
      fuelPrice,
      status: data.status || existing.status,
    });

    await auditRepository.recordLog(
      session.userId,
      "UPDATE_BIKE",
      "BIKE",
      updated.id,
      `Admin updated bike ${updated.registrationNumber} (KM: ${newKm}, Petrol Rate: ₹${fuelPrice}/L, Status: ${updated.status})`
    );

    return updated;
  }
}

export const bikeService = new BikeService();
