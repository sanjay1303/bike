import { fuelRepository, FuelQueryFilter } from "@/repositories/fuel.repository";
import { tripRepository } from "@/repositories/trip.repository";
import { bikeRepository } from "@/repositories/bike.repository";
import { auditRepository } from "@/repositories/audit.repository";
import { calculatePricePerLitre, calculateMileage } from "@/core/calculations";
import { ValidationError, NotFoundError, ForbiddenError } from "@/core/errors";
import { UserSession } from "@/lib/auth";

export class FuelService {
  async listFuelEntries(session: UserSession, filter: FuelQueryFilter, page = 1, limit = 50) {
    const effectiveFilter: FuelQueryFilter = {
      ...filter,
      userId: session.role === "ADMIN" ? filter.userId : session.userId,
    };

    const skip = (page - 1) * limit;
    const [fuelEntries, totalCount, tripAgg, fuelAgg] = await Promise.all([
      fuelRepository.findEntries(effectiveFilter, skip, limit),
      fuelRepository.countEntries(effectiveFilter),
      tripRepository.aggregateDistance(effectiveFilter.userId),
      fuelRepository.aggregateFuel(effectiveFilter.userId),
    ]);

    const totalKm = tripAgg._sum.distanceKm || 0;
    const totalLitres = fuelAgg._sum.litres || 0;
    const mileage = calculateMileage(totalKm, totalLitres);

    return {
      fuelEntries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      mileageStats: {
        totalKm,
        totalLitres,
        mileage,
        canCalculate: totalKm > 10 && totalLitres > 0,
      },
    };
  }

  async getFuelById(session: UserSession, id: string) {
    const entry = await fuelRepository.findById(id);
    if (!entry) {
      throw new NotFoundError("Fuel entry not found.");
    }

    if (session.role !== "ADMIN" && entry.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to view this fuel record.");
    }

    return entry;
  }

  async createFuelEntry(session: UserSession, data: {
    currentKm: number;
    litres: number;
    amount: number;
    remarks?: string | null;
    date?: string | Date;
    billImageUrl?: string | null;
  }) {
    const currentKm = Math.round(parseFloat(data.currentKm as any) * 10) / 10;
    const litres = parseFloat(data.litres as any);
    const amount = parseFloat(data.amount as any);
    const remarks = data.remarks?.trim() || null;
    const date = data.date ? new Date(data.date) : new Date();

    if (isNaN(currentKm) || currentKm <= 0) {
      throw new ValidationError("Please enter a valid Current KM.");
    }
    if (isNaN(litres) || litres <= 0) {
      throw new ValidationError("Please enter a valid fuel quantity in litres.");
    }
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError("Please enter a valid amount in Rupees.");
    }

    if (!data.billImageUrl || !data.billImageUrl.trim()) {
      throw new ValidationError("Petrol bill receipt / proof of payment is mandatory.");
    }

    const pricePerLitre = calculatePricePerLitre(amount, litres);

    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found.");
    }

    const fuelEntry = await fuelRepository.create({
      userId: session.userId,
      bikeId: bike.id,
      date,
      currentKm,
      litres,
      amount,
      pricePerLitre,
      billImageUrl: data.billImageUrl || null,
      remarks,
    });

    await bikeRepository.updateOdometerIfHigher(bike.id, currentKm);

    await auditRepository.recordLog(
      session.userId,
      "CREATE_FUEL",
      "FUEL_ENTRY",
      fuelEntry.id,
      `${session.name} added fuel entry: ${litres}L (₹${amount})`
    );

    return fuelEntry;
  }

  async updateFuelEntry(session: UserSession, id: string, data: {
    currentKm?: number;
    litres?: number;
    amount?: number;
    remarks?: string | null;
    date?: string | Date;
  }) {
    const existing = await fuelRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Fuel entry not found.");
    }

    if (session.role !== "ADMIN" && existing.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to modify this fuel entry.");
    }

    const currentKm =
      data.currentKm !== undefined
        ? Math.round(parseFloat(data.currentKm as any) * 10) / 10
        : existing.currentKm;
    const litres = data.litres !== undefined ? parseFloat(data.litres as any) : existing.litres;
    const amount = data.amount !== undefined ? parseFloat(data.amount as any) : existing.amount;
    const remarks = data.remarks !== undefined ? data.remarks?.trim() : existing.remarks;
    const date = data.date ? new Date(data.date) : existing.date;

    const pricePerLitre = calculatePricePerLitre(amount, litres);

    const updated = await fuelRepository.update(id, {
      currentKm,
      litres,
      amount,
      pricePerLitre,
      remarks,
      date,
    });

    await auditRepository.recordLog(
      session.userId,
      "UPDATE_FUEL",
      "FUEL_ENTRY",
      id,
      `${session.name} updated fuel record #${id} (${litres}L, ₹${amount})`
    );

    return updated;
  }

  async deleteFuelEntry(session: UserSession, id: string) {
    const existing = await fuelRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Fuel entry not found.");
    }

    if (session.role !== "ADMIN" && existing.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to delete this fuel record.");
    }

    await fuelRepository.delete(id);

    await auditRepository.recordLog(
      session.userId,
      "DELETE_FUEL",
      "FUEL_ENTRY",
      id,
      `${session.name} deleted fuel entry #${id}`
    );

    return { success: true };
  }
}

export const fuelService = new FuelService();
