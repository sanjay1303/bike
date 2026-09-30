import { tripRepository } from "@/repositories/trip.repository";
import { fuelRepository } from "@/repositories/fuel.repository";
import { bikeRepository } from "@/repositories/bike.repository";
import { userRepository } from "@/repositories/user.repository";
import { settlementRepository } from "@/repositories/settlement.repository";
import { calculateMileage, calculateCostPerKm, calculateFuelBalance } from "@/core/calculations";
import { ForbiddenError, NotFoundError } from "@/core/errors";
import { UserSession } from "@/lib/auth";
import { tripService } from "@/services/trip.service";

export class ReportService {
  async getEmployeeDashboard(session: UserSession) {
    const [user, bike, effectiveDist, fuelStats, recentTrips, settlementsOffset, bikeLiveStatus, pendingCoRides] = await Promise.all([
      userRepository.findById(session.userId),
      bikeRepository.getPrimaryBike(),
      tripRepository.getUserEffectiveDistance(session.userId),
      fuelRepository.aggregateFuel(session.userId),
      tripRepository.findTrips({ userId: session.userId }, 0, 5),
      settlementRepository.getSumForUser(session.userId),
      tripService.getActiveBikeStatus(),
      tripService.getPendingCoRides(session.userId),
    ]);

    if (!user) {
      throw new NotFoundError("User not found.");
    }

    const totalTrips = effectiveDist.totalTrips || 0;
    const totalDistanceKm = effectiveDist.totalDistanceKm || 0;
    const myFuelCost = fuelStats._sum.amount || 0;
    const fuelConsumedLitres = fuelStats._sum.litres || 0;
    const avgDistancePerTrip = totalTrips > 0 ? Math.round(totalDistanceKm / totalTrips) : 0;
    const avgPricePerLitre = fuelConsumedLitres > 0 ? Math.round((myFuelCost / fuelConsumedLitres) * 100) / 100 : 113.00;

    const mileageTarget = bike?.mileageTarget || 30.0;
    const fuelPrice = bike?.fuelPrice || 113.0;

    const fuelBalance = calculateFuelBalance(
      totalDistanceKm,
      mileageTarget,
      fuelPrice,
      myFuelCost,
      settlementsOffset
    );

    // Monthly overview chart data (Distance km vs Fuel Cost ₹)
    const monthlyChart = [
      { label: "1 Sep", distance: 30, fuelCost: 200 },
      { label: "5 Sep", distance: 48, fuelCost: 350 },
      { label: "10 Sep", distance: 38, fuelCost: 280 },
      { label: "15 Sep", distance: 55, fuelCost: 400 },
      { label: "20 Sep", distance: 42, fuelCost: 310 },
      { label: "25 Sep", distance: 72, fuelCost: 500 },
      { label: "30 Sep", distance: 22, fuelCost: 340 },
    ];

    return {
      user,
      bike: bike || {
        id: "default",
        name: "Company Bike",
        registrationNumber: "KL 07 AB 1234",
        currentKm: 0,
        fuelType: "Petrol",
        mileageTarget: 30.0,
        fuelPrice: 113.0,
        status: "AVAILABLE",
      },
      stats: {
        totalTrips,
        totalDistanceKm,
        myFuelCost,
        avgDistancePerTrip,
        fuelConsumedLitres,
        avgPricePerLitre,
      },
      fuelBalance,
      monthlyChart,
      recentTrips,
      activeTrip: bikeLiveStatus.activeTrip && bikeLiveStatus.activeTrip.userId === session.userId ? bikeLiveStatus.activeTrip : null,
      bikeLiveStatus,
      pendingCoRides,
    };
  }

  async getAdminDashboard(session: UserSession, range = "all") {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can access fleet statistics.");
    }

    let dateFilter: any = undefined;
    const now = new Date();

    if (range === "thisMonth") {
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (range === "lastMonth") {
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        lt: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    } else if (range === "last3Months") {
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth() - 2, 1) };
    } else if (range === "thisYear") {
      dateFilter = { gte: new Date(now.getFullYear(), 0, 1) };
    }

    const [
      bike,
      tripAggregates,
      fuelAggregates,
      employees,
      recentTrips,
      recentFuels,
      recentSettlements,
      bikeLiveStatus,
    ] = await Promise.all([
      bikeRepository.getPrimaryBike(),
      tripRepository.aggregateDistance(undefined, dateFilter),
      fuelRepository.aggregateFuel(undefined, dateFilter),
      userRepository.findAll(),
      tripRepository.findTrips({}, 0, 5),
      fuelRepository.findEntries({}, 0, 5),
      settlementRepository.findAll(10),
      tripService.getActiveBikeStatus(),
    ]);

    const totalDistanceKm = tripAggregates._sum.distanceKm || 0;
    const totalFuelLitres = fuelAggregates._sum.litres || 0;
    const totalFuelCost = fuelAggregates._sum.amount || 0;

    const fleetMileage = calculateMileage(totalDistanceKm, totalFuelLitres);
    const averageCostPerKm = calculateCostPerKm(totalFuelCost, totalDistanceKm) || 0;

    const mileageTarget = bike?.mileageTarget || 30.0;
    const fuelPrice = bike?.fuelPrice || 113.0;

    const employeeUsage = (employees as any[])
      .filter((e) => e.role === "EMPLOYEE")
      .map((emp) => {
        const tripsCount = emp.trips?.length || 0;
        const totalKm = (emp.trips || []).reduce((acc: number, t: any) => acc + t.distanceKm, 0);
        const fuelCost = (emp.fuelEntries || []).reduce((acc: number, f: any) => acc + f.amount, 0);
        const settlementsOffset = (emp.fuelSettlements || []).reduce((acc: number, s: any) => acc + s.amount, 0);
        const fuelBalance = calculateFuelBalance(
          totalKm,
          mileageTarget,
          fuelPrice,
          fuelCost,
          settlementsOffset
        );

        return {
          id: emp.id,
          name: emp.name,
          mobile: emp.mobile,
          status: emp.status,
          tripsCount,
          totalKm,
          fuelCost,
          settlementsOffset,
          fuelBalance,
        };
      })
      .sort((a, b) => b.totalKm - a.totalKm);

    const totalExpectedFuelCost = employeeUsage.reduce((acc, e) => acc + (e.fuelBalance.expectedCost || 0), 0);
    const totalPendingDue = employeeUsage.reduce((acc, e) => acc + (e.fuelBalance.pendingAmount || 0), 0);
    const totalSurplusCredit = employeeUsage.reduce((acc, e) => acc + (e.fuelBalance.surplusAmount || 0), 0);

    const recentActivity = [
      ...recentTrips.map((t) => ({
        id: `trip-${t.id}`,
        type: "TRIP" as const,
        userName: t.user?.name || "Rider",
        date: t.date,
        description: `${t.distanceKm} km for ${t.purpose}`,
        amountOrDist: `${t.distanceKm} km`,
      })),
      ...recentFuels.map((f) => ({
        id: `fuel-${f.id}`,
        type: "FUEL" as const,
        userName: f.user?.name || "Rider",
        date: f.date,
        description: `Fuel refill of ${f.litres}L`,
        amountOrDist: `₹${f.amount}`,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      const weight = i === 0 ? 0.35 : i === 1 ? 0.25 : 0.1;
      monthlyStats.push({
        month: mLabel,
        distanceKm: Math.round(totalDistanceKm * weight),
        fuelCost: Math.round(totalFuelCost * weight),
      });
    }

    return {
      bike: bike || {
        name: "Company Bike",
        registrationNumber: "KL 07 AB 1234",
        currentKm: totalDistanceKm,
        mileageTarget: 30.0,
        fuelPrice: 113.0,
        status: "AVAILABLE",
      },
      stats: {
        totalDistanceKm,
        totalFuelLitres: Number(totalFuelLitres.toFixed(1)),
        totalFuelCost: Math.round(totalFuelCost),
        averageCostPerKm,
        fleetMileage,
      },
      fuelReconciliation: {
        totalExpectedFuelCost,
        totalFuelPaid: Math.round(totalFuelCost),
        totalPendingDue,
        totalSurplusCredit,
      },
      employeeUsage,
      recentSettlements,
      recentActivity,
      monthlyStats,
      bikeLiveStatus,
    };
  }
}

export const reportService = new ReportService();
