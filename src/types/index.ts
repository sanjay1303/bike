export type Role = "ADMIN" | "EMPLOYEE";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type BikeStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  role: Role;
  status: UserStatus;
  mustChangePassword?: boolean;
  createdAt: string | Date;
}

export interface Bike {
  id: string;
  name: string;
  registrationNumber: string;
  currentKm: number;
  fuelType: string;
  mileageTarget: number;
  fuelPrice?: number;
  status: BikeStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ReadingMethod = "PHOTO" | "MANUAL";
export type TripStatus = "ACTIVE" | "COMPLETED";

export type CoRiderConfirmationStatus = "NONE" | "PENDING" | "CONFIRMED" | "NOT_CONFIRMED";
export type FuelSplitType = "NONE" | "PAID_BY_PRIMARY" | "PAID_BY_CO_RIDER" | "SPLIT_EQUALLY";

export interface CoRiderInfo {
  id: string;
  name: string;
  mobile: string;
}

export interface PendingCoRiderConfirmation {
  id: string;
  date: string | Date;
  startingKm: number;
  endingKm: number;
  distanceKm: number;
  coRiderKm: number;
  purpose: string;
  primaryRider: CoRiderInfo;
  fuelSplitType: FuelSplitType;
  coRiderFuelShare: number;
  status: TripStatus;
  createdAt: string | Date;
}

export interface ActiveRiderInfo {
  id: string;
  name: string;
  mobile: string;
  startedAt: string | Date;
  startingKm: number;
  purpose: string;
  startOdometerPhoto?: string | null;
  isDoubleRide?: boolean;
  coRider?: CoRiderInfo | null;
  fuelSplitType?: FuelSplitType;
}

export interface LastRiderInfo {
  id: string;
  name: string;
  mobile: string;
  endedAt: string | Date;
  endingKm: number;
  distanceKm: number;
  purpose: string;
  isDoubleRide?: boolean;
  coRiderName?: string | null;
}

export interface BikeLiveStatus {
  bike: Bike;
  inUse: boolean;
  activeTrip: Trip | null;
  currentRider: ActiveRiderInfo | null;
  lastRider: LastRiderInfo | null;
}

export interface Trip {
  id: string;
  userId: string;
  bikeId: string;
  date: string | Date;
  startingKm: number;
  endingKm: number;
  distanceKm: number;
  purpose: string;
  remarks?: string | null;
  status?: TripStatus;
  hasFuelEntry?: boolean;
  startOdometerPhoto?: string | null;
  endOdometerPhoto?: string | null;
  startReadingMethod?: ReadingMethod;
  endReadingMethod?: ReadingMethod;
  startOcrConfidence?: number | null;
  endOcrConfidence?: number | null;

  // Double Ride & Co-Rider Split
  isDoubleRide?: boolean;
  coRiderId?: string | null;
  coRiderConfirmation?: CoRiderConfirmationStatus;
  coRiderConfirmedAt?: string | Date | null;
  fuelSplitType?: FuelSplitType;
  primaryRiderKm?: number | null;
  coRiderKm?: number | null;
  primaryFuelShare?: number | null;
  coRiderFuelShare?: number | null;
  coRider?: CoRiderInfo | null;

  user?: {
    id: string;
    name: string;
    mobile: string;
  };
  bike?: {
    id: string;
    name: string;
    registrationNumber: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FuelEntry {
  id: string;
  userId: string;
  bikeId: string;
  date: string | Date;
  currentKm: number;
  litres: number;
  amount: number;
  pricePerLitre: number;
  billImageUrl?: string | null;
  remarks?: string | null;
  user?: {
    id: string;
    name: string;
    mobile: string;
  };
  bike?: {
    id: string;
    name: string;
    registrationNumber: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FuelBalanceSummary {
  totalDistanceKm: number;
  expectedLitres: number;
  expectedCost: number;
  actualFuelPaid: number;
  settlementsOffset: number;
  netBalance: number;
  pendingAmount: number;
  surplusAmount: number;
  status: "EXTRA_BALANCE" | "PENDING_PAYMENT" | "SETTLED";
}

export interface FuelSettlement {
  id: string;
  userId: string;
  adminId?: string | null;
  amount: number;
  type: "COLLECTED_FROM_EMPLOYEE" | "REIMBURSED_TO_EMPLOYEE" | "BALANCE_CLEAR";
  notes?: string | null;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    mobile: string;
  };
}

export interface EmployeeDashboardData {
  user: User;
  bike: Bike;
  stats: {
    totalTrips: number;
    totalDistanceKm: number;
    myFuelCost: number;
    avgDistancePerTrip: number;
    fuelConsumedLitres?: number;
    avgPricePerLitre?: number;
  };
  fuelBalance?: FuelBalanceSummary;
  monthlyChart?: {
    label: string;
    distance: number;
    fuelCost: number;
  }[];
  recentTrips: Trip[];
  activeTrip?: Trip | null;
  bikeLiveStatus?: BikeLiveStatus;
  pendingCoRides?: PendingCoRiderConfirmation[];
}

export interface AdminDashboardData {
  stats: {
    totalDistanceKm: number;
    totalFuelLitres: number;
    totalFuelCost: number;
    averageCostPerKm: number;
    fleetMileage: number | null;
  };
  fuelReconciliation?: {
    totalExpectedFuelCost: number;
    totalFuelPaid: number;
    totalPendingDue: number;
    totalSurplusCredit: number;
  };
  bike: Bike;
  monthlyStats: {
    month: string;
    distanceKm: number;
    fuelCost: number;
  }[];
  bikeLiveStatus?: BikeLiveStatus;
  employeeUsage: {
    id: string;
    name: string;
    mobile?: string;
    status?: string;
    tripsCount: number;
    totalKm: number;
    fuelCost: number;
    settlementsOffset?: number;
    fuelBalance?: FuelBalanceSummary;
  }[];
  recentSettlements?: FuelSettlement[];
  recentActivity: {
    id: string;
    type: "TRIP" | "FUEL";
    userName: string;
    date: string | Date;
    description: string;
    amountOrDist: string;
  }[];
}

