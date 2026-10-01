import { prisma } from "@/lib/prisma";

export interface TripQueryFilter {
  userId?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class TripRepository {
  async findTrips(filter: TripQueryFilter, skip = 0, take = 50) {
    const where = this.buildWhereClause(filter);
    return prisma.trip.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take,
    });
  }

  async countTrips(filter: TripQueryFilter) {
    const where = this.buildWhereClause(filter);
    return prisma.trip.count({ where });
  }

  async findById(id: string) {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async findActiveTrip(bikeId?: string) {
    const where: any = { status: "ACTIVE" };
    if (bikeId) where.bikeId = bikeId;
    return prisma.trip.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true, currentKm: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findLastCompletedTrip(bikeId?: string) {
    const where: any = { status: "COMPLETED" };
    if (bikeId) where.bikeId = bikeId;
    return prisma.trip.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true, currentKm: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findPendingCoRiderTrips(coRiderId: string) {
    return prisma.trip.findMany({
      where: {
        coRiderId,
        coRiderConfirmation: "PENDING",
      },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findRejectedCoRiderTrips(userId: string) {
    return prisma.trip.findMany({
      where: {
        userId,
        isDoubleRide: true,
        coRiderConfirmation: "NOT_CONFIRMED",
        coRiderRejectionAcknowledged: false,
      },
      include: {
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async acknowledgeRejection(tripId: string, userId: string) {
    return prisma.trip.updateMany({
      where: { id: tripId, userId },
      data: { coRiderRejectionAcknowledged: true },
    });
  }

  async create(data: {
    userId: string;
    bikeId: string;
    date: Date;
    startingKm: number;
    endingKm?: number;
    distanceKm?: number;
    purpose: string;
    remarks?: string | null;
    status?: string;
    hasFuelEntry?: boolean;
    startOdometerPhoto?: string | null;
    endOdometerPhoto?: string | null;
    startReadingMethod?: string;
    endReadingMethod?: string;
    startOcrConfidence?: number | null;
    endOcrConfidence?: number | null;
    isDoubleRide?: boolean;
    coRiderId?: string | null;
    coRiderConfirmation?: string;
    coRiderConfirmedAt?: Date | null;
    fuelSplitType?: string;
    primaryRiderKm?: number | null;
    coRiderKm?: number | null;
    primaryFuelShare?: number | null;
    coRiderFuelShare?: number | null;
  }) {
    return prisma.trip.create({
      data: {
        ...data,
        status: data.status || "COMPLETED",
        endingKm: data.endingKm !== undefined ? data.endingKm : 0,
        distanceKm: data.distanceKm !== undefined ? data.distanceKm : 0,
      },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async update(id: string, data: {
    startingKm?: number;
    endingKm?: number;
    distanceKm?: number;
    purpose?: string;
    remarks?: string | null;
    status?: string;
    hasFuelEntry?: boolean;
    date?: Date;
    endOdometerPhoto?: string | null;
    endReadingMethod?: string;
    endOcrConfidence?: number | null;
    isDoubleRide?: boolean;
    coRiderId?: string | null;
    coRiderConfirmation?: string;
    coRiderConfirmedAt?: Date | null;
    coRiderRejectionAcknowledged?: boolean;
    fuelSplitType?: string;
    primaryRiderKm?: number | null;
    coRiderKm?: number | null;
    primaryFuelShare?: number | null;
    coRiderFuelShare?: number | null;
  }) {
    return prisma.trip.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        coRider: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.trip.delete({ where: { id } });
  }

  async aggregateDistance(userId?: string, dateFilter?: any) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (dateFilter) where.date = dateFilter;

    return prisma.trip.aggregate({
      where,
      _count: { id: true },
      _sum: { distanceKm: true },
    });
  }

  async getUserEffectiveDistance(userId: string, dateFilter?: any) {
    const wherePrimary: any = { userId, status: "COMPLETED" };
    if (dateFilter) wherePrimary.date = dateFilter;

    const primaryTrips = await prisma.trip.findMany({
      where: wherePrimary,
      select: { distanceKm: true, isDoubleRide: true, primaryRiderKm: true, coRiderConfirmation: true },
    });

    let primaryKm = 0;
    for (const t of primaryTrips) {
      if (t.isDoubleRide && t.coRiderConfirmation === "CONFIRMED" && typeof t.primaryRiderKm === "number") {
        primaryKm += t.primaryRiderKm;
      } else {
        primaryKm += t.distanceKm;
      }
    }

    const whereCoRider: any = { coRiderId: userId, status: "COMPLETED", coRiderConfirmation: "CONFIRMED" };
    if (dateFilter) whereCoRider.date = dateFilter;

    const coRiderTrips = await prisma.trip.findMany({
      where: whereCoRider,
      select: { coRiderKm: true },
    });

    let coRiderKm = 0;
    for (const t of coRiderTrips) {
      if (typeof t.coRiderKm === "number") {
        coRiderKm += t.coRiderKm;
      }
    }

    return {
      totalDistanceKm: Math.round(primaryKm + coRiderKm),
      totalTrips: primaryTrips.length + coRiderTrips.length,
    };
  }

  private buildWhereClause(filter: TripQueryFilter) {
    const where: any = {};
    if (filter.userId) {
      where.OR = [
        { userId: filter.userId },
        { coRiderId: filter.userId },
      ];
    }
    if (filter.purpose && filter.purpose !== "ALL") where.purpose = filter.purpose;
    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) where.date.gte = new Date(filter.startDate);
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (filter.search) {
      const searchConditions = [
        { purpose: { contains: filter.search } },
        { remarks: { contains: filter.search } },
        { user: { name: { contains: filter.search } } },
        { coRider: { name: { contains: filter.search } } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }
    return where;
  }
}

export const tripRepository = new TripRepository();

