import { prisma } from "@/lib/prisma";

export class UserRepository {
  async findByMobile(mobile: string) {
    return prisma.user.findUnique({ where: { mobile } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      include: {
        _count: {
          select: { trips: true, fuelEntries: true },
        },
        trips: {
          select: { distanceKm: true },
        },
        fuelEntries: {
          select: { amount: true },
        },
        fuelSettlements: {
          select: { amount: true, type: true, createdAt: true, notes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdWithPassword(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        password: true,
        mustChangePassword: true,
        role: true,
        status: true,
      },
    });
  }

  async create(data: { name: string; mobile: string; email?: string | null; role: string; status: string; password?: string; mustChangePassword?: boolean }) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: { name?: string; mobile?: string; email?: string | null; role?: string; status?: string; password?: string; mustChangePassword?: boolean }) {
    return prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: string, newHashedPassword: string, mustChangePassword = false) {
    return prisma.user.update({
      where: { id },
      data: { password: newHashedPassword, mustChangePassword },
    });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  // OTP Methods
  async saveOtp(mobile: string, code: string, expiresAt: Date) {
    await prisma.otpCode.deleteMany({
      where: { mobile, verified: false },
    });
    return prisma.otpCode.create({
      data: { mobile, code, expiresAt, verified: false },
    });
  }

  async findValidOtp(mobile: string, code: string) {
    return prisma.otpCode.findFirst({
      where: { mobile, code, verified: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async markOtpVerified(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: { verified: true },
    });
  }
}

export const userRepository = new UserRepository();
