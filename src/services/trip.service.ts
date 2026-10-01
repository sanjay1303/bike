import { tripRepository, TripQueryFilter } from "@/repositories/trip.repository";
import { bikeRepository } from "@/repositories/bike.repository";
import { fuelRepository } from "@/repositories/fuel.repository";
import { userRepository } from "@/repositories/user.repository";
import { auditRepository } from "@/repositories/audit.repository";
import { calculateTripDistance } from "@/core/calculations";
import { ValidationError, NotFoundError, ForbiddenError, BikeInUseError } from "@/core/errors";
import { UserSession } from "@/lib/auth";
import { BikeLiveStatus } from "@/types";

export class TripService {
  /**
   * Retrieves the live operational status of the primary company bike,
   * including whether it is currently in use, by whom, and who last completed a trip.
   */
  async getActiveBikeStatus(): Promise<BikeLiveStatus> {
    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found in system.");
    }

    const [activeTrip, lastTrip] = await Promise.all([
      tripRepository.findActiveTrip(bike.id),
      tripRepository.findLastCompletedTrip(bike.id),
    ]);

    const inUse = Boolean(activeTrip);

    const currentRider = activeTrip
      ? {
          id: activeTrip.user.id,
          name: activeTrip.user.name,
          mobile: activeTrip.user.mobile,
          startedAt: activeTrip.createdAt,
          startingKm: activeTrip.startingKm,
          purpose: activeTrip.purpose,
          startOdometerPhoto: activeTrip.startOdometerPhoto,
          isDoubleRide: Boolean(activeTrip.isDoubleRide),
          coRider: activeTrip.coRider ? { id: activeTrip.coRider.id, name: activeTrip.coRider.name, mobile: activeTrip.coRider.mobile } : null,
          fuelSplitType: (activeTrip.fuelSplitType as any) || "NONE",
        }
      : null;

    const lastRider = lastTrip
      ? {
          id: lastTrip.user.id,
          name: lastTrip.user.name,
          mobile: lastTrip.user.mobile,
          endedAt: lastTrip.updatedAt || lastTrip.date,
          endingKm: lastTrip.endingKm,
          distanceKm: lastTrip.distanceKm,
          purpose: lastTrip.purpose,
          isDoubleRide: Boolean(lastTrip.isDoubleRide),
          coRiderName: lastTrip.coRider ? lastTrip.coRider.name : null,
        }
      : null;

    return {
      bike: bike as any,
      inUse,
      activeTrip: activeTrip as any,
      currentRider,
      lastRider,
    };
  }

  /**
   * Starts a new ride on the bike.
   * Locks the bike to the current user and sets status to "IN_USE".
   * If another user is currently using the bike (has not added stopping reading),
   * throws a BikeInUseError with the other user's name & details so a popup can be shown.
   */
  async startTrip(
    session: UserSession,
    data: {
      startingKm: number;
      purpose: string;
      remarks?: string | null;
      startOdometerPhoto?: string | null;
      startReadingMethod?: "PHOTO" | "MANUAL";
      startOcrConfidence?: number | null;
      isDoubleRide?: boolean;
      coRiderId?: string | null;
      fuelSplitType?: string;
    }
  ) {
    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found in system.");
    }

    // 1. Check if bike is currently in use by anyone
    const activeTrip = await tripRepository.findActiveTrip(bike.id);
    if (activeTrip) {
      if (activeTrip.userId !== session.userId) {
        throw new BikeInUseError(
          `Bike is currently in use. ${activeTrip.user.name} has not added the ending odometer reading yet.`,
          {
            id: activeTrip.user.id,
            name: activeTrip.user.name,
            mobile: activeTrip.user.mobile,
            startedAt: activeTrip.createdAt,
            startingKm: activeTrip.startingKm,
            purpose: activeTrip.purpose,
            isDoubleRide: Boolean(activeTrip.isDoubleRide),
            coRider: activeTrip.coRider ? { id: activeTrip.coRider.id, name: activeTrip.coRider.name, mobile: activeTrip.coRider.mobile } : null,
          }
        );
      } else {
        throw new ValidationError(
          "You already have an active ride in progress. Please complete your current ride before starting a new one."
        );
      }
    }

    const startingKm = Math.round(parseFloat(data.startingKm as any) * 10) / 10;
    const purpose = (data.purpose || "").trim();
    const remarks = data.remarks?.trim() || null;

    if (isNaN(startingKm) || startingKm < 0) {
      throw new ValidationError("Please enter a valid Starting KM.");
    }

    if (!purpose) {
      throw new ValidationError("Trip purpose is mandatory. Please enter a trip purpose.");
    }

    // Double Ride Validation
    const isDoubleRide = Boolean(data.isDoubleRide);
    let coRiderId: string | null = null;
    let fuelSplitType = "NONE";
    let coRiderUser: any = null;

    if (isDoubleRide) {
      if (!data.coRiderId || !data.coRiderId.trim()) {
        throw new ValidationError("Please select a co-rider for a double ride.");
      }
      if (data.coRiderId === session.userId) {
        throw new ValidationError("You cannot select yourself as the co-rider.");
      }
      coRiderUser = await userRepository.findById(data.coRiderId);
      if (!coRiderUser || coRiderUser.status !== "ACTIVE") {
        throw new ValidationError("Selected co-rider was not found or is inactive.");
      }
      coRiderId = coRiderUser.id;
      fuelSplitType = data.fuelSplitType || "SPLIT_EQUALLY";
    }

    const startReadingMethod = data.startReadingMethod === "PHOTO" ? "PHOTO" : "MANUAL";
    const startOdometerPhoto = data.startOdometerPhoto || null;
    const startOcrConfidence =
      typeof data.startOcrConfidence === "number" ? data.startOcrConfidence : null;

    // Create the active trip record
    const trip = await tripRepository.create({
      userId: session.userId,
      bikeId: bike.id,
      date: new Date(),
      startingKm,
      endingKm: 0,
      distanceKm: 0,
      purpose,
      remarks,
      status: "ACTIVE",
      hasFuelEntry: false,
      startOdometerPhoto,
      startReadingMethod,
      startOcrConfidence,
      isDoubleRide,
      coRiderId,
      coRiderConfirmation: isDoubleRide ? "PENDING" : "NONE",
      fuelSplitType,
      primaryRiderKm: 0,
      coRiderKm: 0,
      primaryFuelShare: 0,
      coRiderFuelShare: 0,
    });

    // Update bike status to IN_USE
    await bikeRepository.updateBike(bike.id, {
      status: "IN_USE",
    });

    // Audit log
    await auditRepository.recordLog(
      session.userId,
      "RIDE_STARTED",
      "TRIP",
      trip.id,
      `${session.name} started bike ride from ${startingKm} km for ${purpose}${isDoubleRide ? ` (Double ride with ${coRiderUser.name})` : ""}`
    );

    return {
      success: true,
      trip,
    };
  }

  /**
   * Completes an active ride by recording the stopping point odometer reading.
   * Unlocks the bike, updates bike odometer, and sets status back to "AVAILABLE".
   */
  async endTrip(
    session: UserSession,
    data: {
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
    }
  ) {
    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found in system.");
    }

    // Find the active trip
    let activeTrip: any = null;
    if (data.tripId) {
      activeTrip = await tripRepository.findById(data.tripId);
    } else {
      activeTrip = await tripRepository.findActiveTrip(bike.id);
    }

    if (!activeTrip || activeTrip.status !== "ACTIVE") {
      throw new NotFoundError("No active ride found to complete.");
    }

    // Role check: Only the rider or an admin can end the ride
    if (session.role !== "ADMIN" && activeTrip.userId !== session.userId) {
      throw new ForbiddenError("You can only complete your own active ride.");
    }

    const endingKm = Math.round(parseFloat(data.endingKm as any) * 10) / 10;
    if (isNaN(endingKm) || endingKm < 0) {
      throw new ValidationError("Please enter a valid Ending KM.");
    }

    if (endingKm <= activeTrip.startingKm) {
      throw new ValidationError(
        endingKm === activeTrip.startingKm
          ? `Ending KM cannot be the same as Starting KM (${activeTrip.startingKm} km).`
          : `Ending KM (${endingKm} km) cannot be less than Starting KM (${activeTrip.startingKm} km).`
      );
    }

    const distanceKm = calculateTripDistance(activeTrip.startingKm, endingKm);
    const hasFuelEntry = Boolean(data.hasFuelEntry);
    const endReadingMethod = data.endReadingMethod === "PHOTO" ? "PHOTO" : "MANUAL";
    const endOdometerPhoto = data.endOdometerPhoto || null;
    const endOcrConfidence =
      typeof data.endOcrConfidence === "number" ? data.endOcrConfidence : null;
    const remarks = data.remarks?.trim() || activeTrip.remarks;

    // Double Ride Split Calculations
    const isDoubleRide = Boolean(activeTrip.isDoubleRide);
    let primaryRiderKm = distanceKm;
    let coRiderKm = 0;
    let primaryFuelShare = 0;
    let coRiderFuelShare = 0;

    if (isDoubleRide) {
      primaryRiderKm = Math.round(distanceKm / 2);
      coRiderKm = distanceKm - primaryRiderKm;
    }

    if (hasFuelEntry && data.fuel) {
      const amount = parseFloat(data.fuel.amount as any) || 0;
      const splitType = data.fuel.fuelSplitType || activeTrip.fuelSplitType || "SPLIT_EQUALLY";
      if (amount > 0) {
        if (isDoubleRide) {
          if (splitType === "SPLIT_EQUALLY") {
            primaryFuelShare = Math.round((amount / 2) * 100) / 100;
            coRiderFuelShare = Math.round((amount - primaryFuelShare) * 100) / 100;
          } else if (splitType === "PAID_BY_PRIMARY") {
            primaryFuelShare = amount;
            coRiderFuelShare = 0;
          } else if (splitType === "PAID_BY_CO_RIDER") {
            primaryFuelShare = 0;
            coRiderFuelShare = amount;
          }
        } else {
          primaryFuelShare = amount;
          coRiderFuelShare = 0;
        }
      }
    }

    // Update trip to COMPLETED
    const trip = await tripRepository.update(activeTrip.id, {
      endingKm,
      distanceKm,
      status: "COMPLETED",
      remarks,
      hasFuelEntry,
      endOdometerPhoto,
      endReadingMethod,
      endOcrConfidence,
      primaryRiderKm,
      coRiderKm,
      primaryFuelShare,
      coRiderFuelShare,
      coRiderConfirmation: isDoubleRide ? "PENDING" : "NONE",
    });

    // Update bike odometer and release lock to AVAILABLE
    await bikeRepository.updateBike(bike.id, {
      currentKm: Math.max(bike.currentKm, endingKm),
      status: "AVAILABLE",
    });

    // Audit log
    await auditRepository.recordLog(
      session.userId,
      "RIDE_COMPLETED",
      "TRIP",
      trip.id,
      `${session.name} completed bike ride at ${endingKm} km (Distance: ${distanceKm} km)${isDoubleRide ? ` [Double ride split: ${primaryRiderKm} km / ${coRiderKm} km]` : ""}`
    );

    // If fuel refill was added at the stop point
    let fuelEntry: any = null;
    if (hasFuelEntry && data.fuel) {
      const litres = parseFloat(data.fuel.litres as any) || 0;
      const amount = parseFloat(data.fuel.amount as any) || 0;
      const pricePerLitre =
        data.fuel.pricePerLitre || (litres > 0 ? Number((amount / litres).toFixed(2)) : 113);
      const fuelRemarks =
        data.fuel.remarks?.trim() ||
        `Fuel refilled during ${activeTrip.purpose} trip (${distanceKm} km)`;
      const billImageUrl = data.fuel.billImageUrl || null;

      if (litres > 0 && amount > 0) {
        if (!billImageUrl || !billImageUrl.trim()) {
          throw new ValidationError(
            "Petrol bill receipt / proof of payment is mandatory when logging a fuel refill."
          );
        }

        const splitType = data.fuel.fuelSplitType || activeTrip.fuelSplitType || "SPLIT_EQUALLY";

        if (isDoubleRide && splitType === "SPLIT_EQUALLY" && activeTrip.coRiderId) {
          const halfLitres = Number((litres / 2).toFixed(2));
          fuelEntry = await fuelRepository.create({
            userId: activeTrip.userId,
            bikeId: bike.id,
            date: new Date(),
            currentKm: endingKm,
            litres: halfLitres,
            amount: primaryFuelShare,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride 50% split - Primary share]`,
          });

          await fuelRepository.create({
            userId: activeTrip.coRiderId,
            bikeId: bike.id,
            date: new Date(),
            currentKm: endingKm,
            litres: Number((litres - halfLitres).toFixed(2)),
            amount: coRiderFuelShare,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride 50% split - Co-rider share]`,
          });
        } else if (isDoubleRide && splitType === "PAID_BY_CO_RIDER" && activeTrip.coRiderId) {
          fuelEntry = await fuelRepository.create({
            userId: activeTrip.coRiderId,
            bikeId: bike.id,
            date: new Date(),
            currentKm: endingKm,
            litres,
            amount,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride - Paid 100% by Co-rider]`,
          });
        } else {
          fuelEntry = await fuelRepository.create({
            userId: activeTrip.userId,
            bikeId: bike.id,
            date: new Date(),
            currentKm: endingKm,
            litres,
            amount,
            pricePerLitre,
            billImageUrl,
            remarks: isDoubleRide ? `${fuelRemarks} [Shared Ride - Paid 100% by Primary]` : fuelRemarks,
          });
        }

        await auditRepository.recordLog(
          session.userId,
          "CREATE_FUEL",
          "FUEL",
          fuelEntry.id,
          `${session.name} logged fuel refill of ${litres} L (₹${amount}) along with completed trip`
        );
      }
    }

    return {
      success: true,
      trip: {
        ...trip,
        fuelEntry,
      },
    };
  }

  /**
   * Admin Force-Release:
   * Releases the bike if an employee forgot or was unable to submit the end reading.
   */
  async forceReleaseBike(session: UserSession, tripId: string, endingKm?: number) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can force-release the company bike.");
    }

    const trip = await tripRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundError("Trip record not found.");
    }

    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found.");
    }

    const finalKm = endingKm || bike.currentKm;
    const distanceKm = Math.max(0, finalKm - trip.startingKm);

    await tripRepository.update(trip.id, {
      endingKm: finalKm,
      distanceKm,
      status: "COMPLETED",
      remarks: trip.remarks ? `${trip.remarks} (Admin Force-Released)` : "(Admin Force-Released)",
    });

    await bikeRepository.updateBike(bike.id, {
      currentKm: Math.max(bike.currentKm, finalKm),
      status: "AVAILABLE",
    });

    await auditRepository.recordLog(
      session.userId,
      "FORCE_RELEASE_BIKE",
      "BIKE",
      bike.id,
      `Admin ${session.name} force-released bike ${bike.registrationNumber} from ${trip.user.name}'s active ride`
    );

    return {
      success: true,
      message: `Bike released successfully. Status set to AVAILABLE.`,
    };
  }

  async listTrips(session: UserSession, filter: TripQueryFilter, page = 1, limit = 50) {
    // Security Rule: Employee can ONLY query their own records
    const effectiveFilter: TripQueryFilter = {
      ...filter,
      userId: session.role === "ADMIN" ? filter.userId : session.userId,
    };

    const skip = (page - 1) * limit;
    const [trips, totalCount] = await Promise.all([
      tripRepository.findTrips(effectiveFilter, skip, limit),
      tripRepository.countTrips(effectiveFilter),
    ]);

    return {
      trips,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getTripById(session: UserSession, id: string) {
    const trip = await tripRepository.findById(id);
    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }

    if (session.role !== "ADMIN" && trip.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to view this trip record.");
    }

    return trip;
  }

  /**
   * Direct trip creation (completed trip in one go).
   * Checks if bike is currently in use by another user; if so, blocks with BikeInUseError.
   */
  async createTrip(
    session: UserSession,
    data: {
      startingKm: number;
      endingKm: number;
      purpose: string;
      remarks?: string | null;
      date?: string | Date;
      hasFuelEntry?: boolean;
      startOdometerPhoto?: string | null;
      endOdometerPhoto?: string | null;
      startReadingMethod?: string;
      endReadingMethod?: string;
      startOcrConfidence?: number | null;
      endOcrConfidence?: number | null;
      isDoubleRide?: boolean;
      coRiderId?: string | null;
      fuelSplitType?: string;
      fuel?: {
        litres?: number;
        amount?: number;
        pricePerLitre?: number;
        remarks?: string | null;
        billImageUrl?: string | null;
      };
    }
  ) {
    const startingKm = Math.round(parseFloat(data.startingKm as any) * 10) / 10;
    const endingKm = Math.round(parseFloat(data.endingKm as any) * 10) / 10;
    const purpose = (data.purpose || "").trim();
    const remarks = data.remarks?.trim() || null;
    const date = data.date ? new Date(data.date) : new Date();
    const hasFuelEntry = Boolean(data.hasFuelEntry);

    if (isNaN(startingKm) || startingKm < 0) {
      throw new ValidationError("Please enter a valid Starting KM.");
    }
    if (isNaN(endingKm) || endingKm < 0) {
      throw new ValidationError("Please enter a valid Ending KM.");
    }
    if (endingKm <= startingKm) {
      throw new ValidationError(
        endingKm === startingKm
          ? "Invalid Odometer Reading. Ending KM cannot be the same as Starting KM."
          : "Invalid Odometer Reading. Ending KM cannot be lower than Starting KM."
      );
    }
    if (!purpose) {
      throw new ValidationError("Trip purpose is mandatory. Please enter a trip purpose.");
    }

    const distanceKm = calculateTripDistance(startingKm, endingKm);

    const bike = await bikeRepository.getPrimaryBike();
    if (!bike) {
      throw new NotFoundError("No company bike found in system.");
    }

    // Check if bike is in use by someone else
    const activeTrip = await tripRepository.findActiveTrip(bike.id);
    if (activeTrip && activeTrip.userId !== session.userId) {
      throw new BikeInUseError(
        `Bike is currently in use. ${activeTrip.user.name} has not added the ending odometer reading yet.`,
        {
          id: activeTrip.user.id,
          name: activeTrip.user.name,
          mobile: activeTrip.user.mobile,
          startedAt: activeTrip.createdAt,
          startingKm: activeTrip.startingKm,
          purpose: activeTrip.purpose,
          isDoubleRide: Boolean(activeTrip.isDoubleRide),
          coRider: activeTrip.coRider ? { id: activeTrip.coRider.id, name: activeTrip.coRider.name, mobile: activeTrip.coRider.mobile } : null,
        }
      );
    }

    // Do not allow trip to be completed with an invalid lower reading than bike's current KM
    if (endingKm < bike.currentKm) {
      throw new ValidationError(
        `Invalid Odometer Reading. The new reading (${endingKm} km) is lower than the previous recorded bike odometer (${bike.currentKm} km).`
      );
    }

    // Double Ride Validation & Splits
    const isDoubleRide = Boolean(data.isDoubleRide);
    let coRiderId: string | null = null;
    let fuelSplitType = "NONE";
    let primaryRiderKm = distanceKm;
    let coRiderKm = 0;
    let primaryFuelShare = 0;
    let coRiderFuelShare = 0;
    let coRiderUser: any = null;

    if (isDoubleRide) {
      if (!data.coRiderId || !data.coRiderId.trim()) {
        throw new ValidationError("Please select a co-rider for a double ride.");
      }
      if (data.coRiderId === session.userId) {
        throw new ValidationError("You cannot select yourself as the co-rider.");
      }
      coRiderUser = await userRepository.findById(data.coRiderId);
      if (!coRiderUser || coRiderUser.status !== "ACTIVE") {
        throw new ValidationError("Selected co-rider was not found or is inactive.");
      }
      coRiderId = coRiderUser.id;
      fuelSplitType = data.fuelSplitType || "SPLIT_EQUALLY";
      primaryRiderKm = Math.round(distanceKm / 2);
      coRiderKm = distanceKm - primaryRiderKm;
    }

    if (hasFuelEntry && data.fuel) {
      const amount = parseFloat(data.fuel.amount as any) || 0;
      if (amount > 0) {
        if (isDoubleRide) {
          if (fuelSplitType === "SPLIT_EQUALLY") {
            primaryFuelShare = Math.round((amount / 2) * 100) / 100;
            coRiderFuelShare = Math.round((amount - primaryFuelShare) * 100) / 100;
          } else if (fuelSplitType === "PAID_BY_PRIMARY") {
            primaryFuelShare = amount;
            coRiderFuelShare = 0;
          } else if (fuelSplitType === "PAID_BY_CO_RIDER") {
            primaryFuelShare = 0;
            coRiderFuelShare = amount;
          }
        } else {
          primaryFuelShare = amount;
          coRiderFuelShare = 0;
        }
      }
    }

    const startReadingMethod = data.startReadingMethod === "PHOTO" ? "PHOTO" : "MANUAL";
    const endReadingMethod = data.endReadingMethod === "PHOTO" ? "PHOTO" : "MANUAL";
    const startOdometerPhoto = data.startOdometerPhoto || null;
    const endOdometerPhoto = data.endOdometerPhoto || null;
    const startOcrConfidence =
      typeof data.startOcrConfidence === "number" ? data.startOcrConfidence : null;
    const endOcrConfidence =
      typeof data.endOcrConfidence === "number" ? data.endOcrConfidence : null;

    // Backend security: userId is locked to session.userId
    const trip = await tripRepository.create({
      userId: session.userId,
      bikeId: bike.id,
      date,
      startingKm,
      endingKm,
      distanceKm,
      purpose,
      remarks,
      status: "COMPLETED",
      hasFuelEntry,
      startOdometerPhoto,
      endOdometerPhoto,
      startReadingMethod,
      endReadingMethod,
      startOcrConfidence,
      endOcrConfidence,
      isDoubleRide,
      coRiderId,
      coRiderConfirmation: isDoubleRide ? "PENDING" : "NONE",
      fuelSplitType,
      primaryRiderKm,
      coRiderKm,
      primaryFuelShare,
      coRiderFuelShare,
    });

    // Update bike odometer and ensure status is AVAILABLE
    await bikeRepository.updateBike(bike.id, {
      currentKm: Math.max(bike.currentKm, endingKm),
      status: "AVAILABLE",
    });

    // Audit log for trip
    await auditRepository.recordLog(
      session.userId,
      "CREATE_TRIP",
      "TRIP",
      trip.id,
      `${session.name} logged trip of ${distanceKm} km for ${purpose}${isDoubleRide ? ` (Double ride with ${coRiderUser.name})` : ""}${hasFuelEntry ? " (with fuel refill)" : ""}`
    );

    // If fuel entry was toggled to true and fuel payload was supplied, create fuel entry
    let fuelEntry: any = null;
    if (hasFuelEntry && data.fuel) {
      const litres = parseFloat(data.fuel.litres as any) || 0;
      const amount = parseFloat(data.fuel.amount as any) || 0;
      const pricePerLitre =
        data.fuel.pricePerLitre || (litres > 0 ? Number((amount / litres).toFixed(2)) : 113);
      const fuelRemarks =
        data.fuel.remarks?.trim() || `Fuel refilled during ${purpose} trip (${distanceKm} km)`;
      const billImageUrl = data.fuel.billImageUrl || null;

      if (litres > 0 && amount > 0) {
        if (!billImageUrl || !billImageUrl.trim()) {
          throw new ValidationError(
            "Petrol bill receipt / proof of payment is mandatory when logging a fuel refill."
          );
        }

        if (isDoubleRide && fuelSplitType === "SPLIT_EQUALLY" && coRiderId) {
          const halfLitres = Number((litres / 2).toFixed(2));
          fuelEntry = await fuelRepository.create({
            userId: session.userId,
            bikeId: bike.id,
            date,
            currentKm: endingKm,
            litres: halfLitres,
            amount: primaryFuelShare,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride 50% split - Primary share]`,
          });

          await fuelRepository.create({
            userId: coRiderId,
            bikeId: bike.id,
            date,
            currentKm: endingKm,
            litres: Number((litres - halfLitres).toFixed(2)),
            amount: coRiderFuelShare,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride 50% split - Co-rider share]`,
          });
        } else if (isDoubleRide && fuelSplitType === "PAID_BY_CO_RIDER" && coRiderId) {
          fuelEntry = await fuelRepository.create({
            userId: coRiderId,
            bikeId: bike.id,
            date,
            currentKm: endingKm,
            litres,
            amount,
            pricePerLitre,
            billImageUrl,
            remarks: `${fuelRemarks} [Shared Ride - Paid 100% by Co-rider]`,
          });
        } else {
          fuelEntry = await fuelRepository.create({
            userId: session.userId,
            bikeId: bike.id,
            date,
            currentKm: endingKm,
            litres,
            amount,
            pricePerLitre,
            billImageUrl,
            remarks: isDoubleRide ? `${fuelRemarks} [Shared Ride - Paid 100% by Primary]` : fuelRemarks,
          });
        }

        await auditRepository.recordLog(
          session.userId,
          "CREATE_FUEL",
          "FUEL",
          fuelEntry.id,
          `${session.name} logged fuel refill of ${litres} L (₹${amount}) along with trip`
        );
      }
    }

    return {
      ...trip,
      fuelEntry,
    };
  }

  /**
   * Co-rider confirms or rejects a double ride.
   */
  async confirmCoRide(session: UserSession, tripId: string, confirmed: boolean) {
    const trip = await tripRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundError("Trip record not found.");
    }

    if (trip.coRiderId !== session.userId && session.role !== "ADMIN") {
      throw new ForbiddenError("Only the designated co-rider can confirm or reject this shared ride.");
    }

    const status = confirmed ? "CONFIRMED" : "NOT_CONFIRMED";

    // If co-rider rejected:
    // If the trip was ACTIVE, cancel it and release the bike to AVAILABLE so creator can start a new trip
    let tripStatus = trip.status;
    if (!confirmed && trip.status === "ACTIVE") {
      tripStatus = "CANCELLED";
      await bikeRepository.updateBike(trip.bikeId, {
        status: "AVAILABLE",
      });
    }

    const updatedTrip = await tripRepository.update(trip.id, {
      status: tripStatus,
      coRiderConfirmation: status,
      coRiderConfirmedAt: new Date(),
      coRiderRejectionAcknowledged: false,
    });

    await auditRepository.recordLog(
      session.userId,
      confirmed ? "CO_RIDE_CONFIRMED" : "CO_RIDE_DECLINED",
      "TRIP",
      trip.id,
      `${session.name} marked co-rider status as ${status} for trip #${trip.id} with ${trip.user.name} (${trip.distanceKm} km)`
    );

    return {
      success: true,
      trip: updatedTrip,
      status,
    };
  }

  /**
   * Returns list of pending double ride confirmations for the user.
   */
  async getPendingCoRides(userId: string) {
    const trips = await tripRepository.findPendingCoRiderTrips(userId);
    return trips.map((t) => ({
      id: t.id,
      date: t.date,
      startingKm: t.startingKm,
      endingKm: t.endingKm,
      distanceKm: t.distanceKm,
      coRiderKm: t.coRiderKm || Math.round(t.distanceKm / 2),
      purpose: t.purpose,
      primaryRider: {
        id: t.user.id,
        name: t.user.name,
        mobile: t.user.mobile,
      },
      fuelSplitType: (t.fuelSplitType as any) || "NONE",
      coRiderFuelShare: t.coRiderFuelShare || 0,
      status: t.status as any,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Returns list of rejected double ride notifications for the trip creator.
   */
  async getRejectedCoRides(userId: string) {
    const trips = await tripRepository.findRejectedCoRiderTrips(userId);
    return trips.map((t) => ({
      id: t.id,
      date: t.date,
      startingKm: t.startingKm,
      endingKm: t.endingKm,
      distanceKm: t.distanceKm,
      purpose: t.purpose,
      status: t.status,
      coRider: t.coRider
        ? {
            id: t.coRider.id,
            name: t.coRider.name,
            mobile: t.coRider.mobile,
          }
        : null,
      coRiderConfirmedAt: t.coRiderConfirmedAt,
    }));
  }

  /**
   * Primary rider acknowledges co-rider rejection notification.
   */
  async acknowledgeCoRideRejection(session: UserSession, tripId: string) {
    const trip = await tripRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundError("Trip not found.");
    }
    if (trip.userId !== session.userId && session.role !== "ADMIN") {
      throw new ForbiddenError("You can only acknowledge notifications for your own trips.");
    }
    await tripRepository.acknowledgeRejection(tripId, trip.userId);
    return { success: true };
  }

  async updateTrip(
    session: UserSession,
    id: string,
    data: {
      startingKm?: number;
      endingKm?: number;
      purpose?: string;
      remarks?: string | null;
      date?: string | Date;
    }
  ) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Trip not found.");
    }

    if (session.role !== "ADMIN" && existing.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to modify this trip.");
    }

    const startingKm =
      data.startingKm !== undefined ? Math.round(parseFloat(data.startingKm as any) * 10) / 10 : existing.startingKm;
    const endingKm =
      data.endingKm !== undefined ? Math.round(parseFloat(data.endingKm as any) * 10) / 10 : existing.endingKm;
    const purpose = (data.purpose || existing.purpose).trim();
    const remarks = data.remarks !== undefined ? data.remarks?.trim() : existing.remarks;
    const date = data.date ? new Date(data.date) : existing.date;

    if (endingKm <= startingKm) {
      throw new ValidationError(
        endingKm === startingKm
          ? "Ending KM cannot be the same as Starting KM."
          : "Ending KM cannot be less than Starting KM."
      );
    }

    const distanceKm = calculateTripDistance(startingKm, endingKm);

    const updated = await tripRepository.update(id, {
      startingKm,
      endingKm,
      distanceKm,
      purpose,
      remarks,
      date,
    });

    await bikeRepository.updateOdometerIfHigher(existing.bikeId, endingKm);

    await auditRepository.recordLog(
      session.userId,
      "UPDATE_TRIP",
      "TRIP",
      id,
      `${session.name} updated trip #${id} (${distanceKm} km)`
    );

    return updated;
  }

  async deleteTrip(session: UserSession, id: string) {
    const existing = await tripRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Trip not found.");
    }

    if (session.role !== "ADMIN" && existing.userId !== session.userId) {
      throw new ForbiddenError("You do not have permission to delete this trip.");
    }

    await tripRepository.delete(id);

    await auditRepository.recordLog(
      session.userId,
      "DELETE_TRIP",
      "TRIP",
      id,
      `${session.name} deleted trip #${id}`
    );

    return { success: true };
  }
}

export const tripService = new TripService();
