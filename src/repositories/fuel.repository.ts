import { prisma } from "@/lib/prisma";

export interface FuelQueryFilter {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export class FuelRepository {
  async findEntries(filter: FuelQueryFilter, skip = 0, take = 50) {
    const where = this.buildWhereClause(filter);
    return prisma.fuelEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take,
    });
  }

  async countEntries(filter: FuelQueryFilter) {
    const where = this.buildWhereClause(filter);
    return prisma.fuelEntry.count({ where });
  }

  async findById(id: string) {
    return prisma.fuelEntry.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async create(data: {
    userId: string;
    bikeId: string;
    date: Date;
    currentKm: number;
    litres: number;
    amount: number;
    pricePerLitre: number;
    billImageUrl?: string | null;
    remarks?: string | null;
  }) {
    return prisma.fuelEntry.create({
      data,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async update(id: string, data: {
    currentKm?: number;
    litres?: number;
    amount?: number;
    pricePerLitre?: number;
    billImageUrl?: string | null;
    remarks?: string | null;
    date?: Date;
  }) {
    return prisma.fuelEntry.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        bike: { select: { id: true, name: true, registrationNumber: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.fuelEntry.delete({ where: { id } });
  }

  async aggregateFuel(userId?: string, dateFilter?: any) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (dateFilter) where.date = dateFilter;

    return prisma.fuelEntry.aggregate({
      where,
      _sum: { litres: true, amount: true },
    });
  }

  private buildWhereClause(filter: FuelQueryFilter) {
    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.startDate || filter.endDate) {
      where.date = {};
      if (filter.startDate) where.date.gte = new Date(filter.startDate);
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    return where;
  }
}

export const fuelRepository = new FuelRepository();
