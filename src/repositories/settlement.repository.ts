import { prisma } from "../lib/prisma";

export class SettlementRepository {
  async create(data: {
    userId: string;
    adminId?: string;
    amount: number;
    type: "COLLECTED_FROM_EMPLOYEE" | "REIMBURSED_TO_EMPLOYEE" | "BALANCE_CLEAR";
    notes?: string;
  }) {
    return prisma.fuelSettlement.create({
      data: {
        userId: data.userId,
        adminId: data.adminId,
        amount: data.amount,
        type: data.type,
        notes: data.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.fuelSettlement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(limit = 50) {
    return prisma.fuelSettlement.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
    });
  }

  async getSumForUser(userId: string): Promise<number> {
    const settlements = await prisma.fuelSettlement.findMany({
      where: { userId },
      select: { amount: true },
    });
    return settlements.reduce((acc, curr) => acc + curr.amount, 0);
  }
}

export const settlementRepository = new SettlementRepository();
