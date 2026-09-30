import { prisma } from "@/lib/prisma";

export class BikeRepository {
  async getPrimaryBike() {
    return prisma.bike.findFirst();
  }

  async updateBike(id: string, data: {
    name?: string;
    registrationNumber?: string;
    currentKm?: number;
    fuelType?: string;
    mileageTarget?: number;
    fuelPrice?: number;
    status?: string;
  }) {
    return prisma.bike.update({
      where: { id },
      data,
    });
  }

  async updateOdometerIfHigher(id: string, newKm: number) {
    const bike = await prisma.bike.findUnique({ where: { id } });
    if (bike && newKm > bike.currentKm) {
      return prisma.bike.update({
        where: { id },
        data: { currentKm: newKm },
      });
    }
    return bike;
  }
}

export const bikeRepository = new BikeRepository();
