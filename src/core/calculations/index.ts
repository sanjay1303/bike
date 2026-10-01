import { ValidationError } from "../errors";

/**
 * Calculate distance travelled in kilometers.
 * Formula: endingKm - startingKm
 */
export function calculateTripDistance(startingKm: number, endingKm: number): number {
  if (endingKm <= startingKm) {
    throw new ValidationError(
      endingKm === startingKm
        ? "Ending KM cannot be the same as Starting KM."
        : "Ending KM cannot be less than Starting KM."
    );
  }
  return Number((endingKm - startingKm).toFixed(2));
}

/**
 * Calculate fuel price per litre in Rupees.
 * Formula: amount / litres
 */
export function calculatePricePerLitre(amount: number, litres: number): number {
  if (litres <= 0) {
    throw new ValidationError("Fuel quantity must be greater than zero.");
  }
  return Number((amount / litres).toFixed(2));
}

/**
 * Calculate fleet mileage (km per litre).
 * Formula: totalDistanceKm / totalFuelLitres
 */
export function calculateMileage(totalDistanceKm: number, totalFuelLitres: number): number | null {
  if (!totalFuelLitres || totalFuelLitres <= 0 || !totalDistanceKm || totalDistanceKm <= 0) {
    return null;
  }
  return Number((totalDistanceKm / totalFuelLitres).toFixed(1));
}

/**
 * Calculate operational cost per kilometer.
 * Formula: totalFuelCost / totalDistanceKm
 */
export function calculateCostPerKm(totalFuelCost: number, totalDistanceKm: number): number | null {
  if (!totalDistanceKm || totalDistanceKm <= 0) {
    return null;
  }
  return Number((totalFuelCost / totalDistanceKm).toFixed(2));
}

/**
 * Format currency in Indian Rupee style (₹)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format kilometer with commas
 */
export function formatKm(km: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(km) + " km";
}

/**
 * Calculate petrol trip expense from distance, mileage, and petrol price
 * Formula: (distance / mileage) * pricePerLitre
 * Example: 30km @ 30km/L and ₹113/L = 1L = ₹113
 */
export function calculatePetrolExpense(
  distanceKm: number,
  mileageKmPerLitre: number,
  pricePerLitre: number
): {
  litresNeeded: number;
  totalCost: number;
  costPerKm: number;
} {
  if (mileageKmPerLitre <= 0) {
    return { litresNeeded: 0, totalCost: 0, costPerKm: 0 };
  }
  const litresNeeded = Number((distanceKm / mileageKmPerLitre).toFixed(2));
  const totalCost = Math.round(litresNeeded * pricePerLitre);
  const costPerKm = Number((pricePerLitre / mileageKmPerLitre).toFixed(2));

  return {
    litresNeeded,
    totalCost,
    costPerKm,
  };
}

export interface FuelBalanceSummary {
  totalDistanceKm: number;
  expectedLitres: number;
  expectedCost: number;
  actualFuelPaid: number;
  settlementsOffset: number;
  netBalance: number; // positive = surplus / extra balance; negative = pending amount to pay admin
  pendingAmount: number; // positive amount employee owes admin / needs to refill
  surplusAmount: number; // positive amount company owes employee / extra petrol pre-filled
  status: "EXTRA_BALANCE" | "PENDING_PAYMENT" | "SETTLED";
}

/**
 * Calculate petrol balance based on bike usage (KM ridden) vs. actual petrol filled
 * Accounts for settlements (cash paid to admin or reimbursed).
 */
export function calculateFuelBalance(
  totalDistanceKm: number,
  mileageKmPerLitre: number,
  fuelPricePerLitre: number,
  actualFuelPaid: number,
  settlementsOffset: number = 0
): FuelBalanceSummary {
  const mileage = mileageKmPerLitre > 0 ? mileageKmPerLitre : 30;
  const price = fuelPricePerLitre > 0 ? fuelPricePerLitre : 113;

  const expectedLitres = Number((totalDistanceKm / mileage).toFixed(2));
  const expectedCost = Math.round((totalDistanceKm / mileage) * price);
  const totalCredited = Math.round(actualFuelPaid + settlementsOffset);
  const netBalance = totalCredited - expectedCost;

  let status: "EXTRA_BALANCE" | "PENDING_PAYMENT" | "SETTLED" = "SETTLED";
  let pendingAmount = 0;
  let surplusAmount = 0;

  if (netBalance < 0) {
    status = "PENDING_PAYMENT";
    pendingAmount = Math.abs(netBalance);
  } else if (netBalance > 0) {
    status = "EXTRA_BALANCE";
    surplusAmount = netBalance;
  }

  return {
    totalDistanceKm,
    expectedLitres,
    expectedCost,
    actualFuelPaid,
    settlementsOffset,
    netBalance,
    pendingAmount,
    surplusAmount,
    status,
  };
}

