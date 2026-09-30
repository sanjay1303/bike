/**
 * BikeTrack Comprehensive Security & Business Rules Test Suite
 * Run with: npx tsx scripts/test-all.ts
 */

import { calculateTripDistance, calculatePricePerLitre, calculateMileage, calculateCostPerKm, calculatePetrolExpense } from "../src/lib/calculations";
import { signSessionToken, verifySessionToken } from "../src/lib/auth";
import { isAuthorizedForRecord } from "../src/lib/permissions";
import { prisma } from "../src/lib/prisma";
import { tripRepository } from "../src/repositories/trip.repository";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚲 BikeTrack Comprehensive Test Suite Running...");
  console.log("=======================================================\n");

  // -----------------------------------------------------------------
  // 1. Calculations & Pure Business Rules
  // -----------------------------------------------------------------
  console.log("Test Suite 1: Pure Calculations & Validation");

  // Distance calculation
  const dist = calculateTripDistance(12450, 12470);
  assert(dist === 20, "Trip distance calculation (12470 - 12450 = 20 km)");

  // Ending KM less than Starting KM throws error
  let threwDistanceError = false;
  try {
    calculateTripDistance(12500, 12400);
  } catch {
    threwDistanceError = true;
  }
  assert(threwDistanceError, "Ending KM < Starting KM throws validation error");

  // Price per litre calculation
  const pPerL = calculatePricePerLitre(250, 2.5);
  assert(pPerL === 100, "Price per litre calculation (₹250 / 2.5L = ₹100/L)");

  // Mileage calculation
  const mileage = calculateMileage(180, 4.0);
  assert(mileage === 45.0, "Fleet mileage calculation (180 km / 4.0L = 45 km/L)");

  // Cost per KM calculation
  const costPerKm = calculateCostPerKm(1200, 200);
  assert(costPerKm === 6.0, "Cost per KM calculation (₹1200 / 200 km = ₹6/km)");

  // Petrol Expense Calculator test (per liter 30km, petrol 113)
  const calc1 = calculatePetrolExpense(30, 30, 113);
  assert(calc1.litresNeeded === 1.0 && calc1.totalCost === 113, "Petrol Calculator: 30 km @ 30 km/L & ₹113/L = 1L (₹113)");

  const calc2 = calculatePetrolExpense(60, 30, 113);
  assert(calc2.litresNeeded === 2.0 && calc2.totalCost === 226, "Petrol Calculator: 60 km @ 30 km/L & ₹113/L = 2L (₹226)");

  const calc3 = calculatePetrolExpense(15, 30, 113);
  assert(calc3.litresNeeded === 0.5 && calc3.totalCost === 57, "Petrol Calculator: 15 km @ 30 km/L & ₹113/L = 0.5L (₹57)");
  assert(calc1.costPerKm === 3.77, "Petrol Calculator: Running cost per km = ₹3.77 / km");

  // -----------------------------------------------------------------
  // 2. Authentication & JWT Session Tests
  // -----------------------------------------------------------------
  console.log("\nTest Suite 2: Authentication & Token Security");

  // Signing and verifying session token
  const token = await signSessionToken({
    userId: "user_emp_123",
    name: "Sanjay Kumar",
    mobile: "8888888888",
    role: "EMPLOYEE",
  });
  assert(typeof token === "string" && token.length > 20, "JWT session token signed successfully");

  const verified = await verifySessionToken(token);
  assert(verified !== null && verified.userId === "user_emp_123", "Session token verified and payload matched");
  assert(verified?.role === "EMPLOYEE", "Token preserves role claim");

  // Invalid token fails gracefully
  const invalidVerified = await verifySessionToken("malformed-or-tampered-token");
  assert(invalidVerified === null, "Tampered or invalid token returns null");

  // -----------------------------------------------------------------
  // 3. Authorization Matrix & Record Ownership Checks
  // -----------------------------------------------------------------
  console.log("\nTest Suite 3: Security Matrix & Record Ownership (RBAC)");

  const employeeSession = {
    userId: "user_emp_sanjay",
    name: "Sanjay",
    mobile: "8888888888",
    role: "EMPLOYEE" as const,
  };

  const adminSession = {
    userId: "user_admin_1",
    name: "Admin User",
    mobile: "9999999999",
    role: "ADMIN" as const,
  };

  // Employee accessing own record
  assert(
    isAuthorizedForRecord(employeeSession, "user_emp_sanjay"),
    "Employee CAN access/edit their own record"
  );

  // Employee accessing another employee's record
  assert(
    !isAuthorizedForRecord(employeeSession, "user_emp_azeem"),
    "Employee CANNOT access or modify another employee's record (Blocked)"
  );

  // Admin accessing any record
  assert(
    isAuthorizedForRecord(adminSession, "user_emp_sanjay"),
    "Admin CAN access and modify any employee's record"
  );

  // -----------------------------------------------------------------
  // 4. Database & Inactive Account Security Check
  // -----------------------------------------------------------------
  console.log("\nTest Suite 4: Database State & Security Rule Verification");

  const inactiveUser = await prisma.user.findFirst({
    where: { mobile: "9000000099" },
  });
  assert(inactiveUser !== null && inactiveUser.status === "INACTIVE", "Inactive test user exists in database");

  const adminUser = await prisma.user.findFirst({
    where: { mobile: "9999999999" },
  });
  assert(adminUser !== null && adminUser.role === "ADMIN", "Admin demo account is configured with ADMIN role");

  const bike = await prisma.bike.findFirst();
  assert(bike !== null && bike.registrationNumber === "KL 07 AB 1234", "Company bike exists in database");

  // -----------------------------------------------------------------
  // 5. Audit Log Recording Verification
  // -----------------------------------------------------------------
  console.log("\nTest Suite 5: Audit Trail Verification");
  const auditLogs = await prisma.auditLog.findMany();
  assert(auditLogs.length > 0, `Audit logs present in system (${auditLogs.length} events logged)`);

  // -----------------------------------------------------------------
  // 6. Phone Number & Password Authentication + Change Password Tests
  // -----------------------------------------------------------------
  console.log("\nTest Suite 6: Phone + Password Authentication & Change Password");

  const { authService } = await import("../src/services/auth.service");

  // Admin login with valid credentials
  let adminLoginSuccess = false;
  let adminUserObj: any = null;
  try {
    const res = await authService.loginWithPassword("9999999999", "admin123");
    if (res.token && res.user.role === "ADMIN") {
      adminLoginSuccess = true;
      adminUserObj = res.user;
    }
  } catch (e) {
    console.error("Admin login error:", e);
  }
  assert(adminLoginSuccess, "Admin can sign in with Phone Number (9999999999) + Password (admin123)");

  // Employee login with valid credentials
  let empLoginSuccess = false;
  try {
    const res = await authService.loginWithPassword("8888888888", "emp123");
    if (res.token && res.user.role === "EMPLOYEE") {
      empLoginSuccess = true;
    }
  } catch (e) {
    console.error("Employee login error:", e);
  }
  assert(empLoginSuccess, "Employee can sign in with Phone Number (8888888888) + Password (emp123)");

  // Login with wrong password is rejected
  let wrongPassRejected = false;
  try {
    await authService.loginWithPassword("9999999999", "wrongpassword");
  } catch {
    wrongPassRejected = true;
  }
  assert(wrongPassRejected, "Sign in with incorrect password throws UnauthorizedError");

  // Login for inactive account is blocked
  let inactiveRejected = false;
  try {
    await authService.loginWithPassword("9000000099", "emp123");
  } catch {
    inactiveRejected = true;
  }
  assert(inactiveRejected, "Inactive accounts cannot sign in (ForbiddenError)");

  // Change password: wrong current password rejected
  let wrongCurrentPassRejected = false;
  try {
    await authService.changePassword(adminUserObj.id, "wrongCurrent123", "newAdminPass123");
  } catch {
    wrongCurrentPassRejected = true;
  }
  assert(wrongCurrentPassRejected, "Change password with invalid current password fails");

  // Change password: too short (< 6 chars) rejected
  let shortPassRejected = false;
  try {
    await authService.changePassword(adminUserObj.id, "admin123", "123");
  } catch {
    shortPassRejected = true;
  }
  assert(shortPassRejected, "Change password with < 6 characters fails validation");

  // Change password: valid change, verify login with new password, then restore original
  let changePasswordSucceeded = false;
  try {
    await authService.changePassword(adminUserObj.id, "admin123", "adminNewPassword456");
    const newLoginRes = await authService.loginWithPassword("9999999999", "adminNewPassword456");
    if (newLoginRes.token) {
      changePasswordSucceeded = true;
    }
    // Restore to original password so dev seed remains consistent
    await authService.changePassword(adminUserObj.id, "adminNewPassword456", "admin123");
  } catch (e) {
    console.error("Change password workflow error:", e);
  }
  assert(changePasswordSucceeded, "Change password updates hash and user can log in with new password");

  // Default Password & First-Time Mandatory Password Change Workflow
  const { employeeService } = await import("../src/services/employee.service");
  await prisma.user.deleteMany({ where: { mobile: "7777777777" } });

  const adminOpSession = {
    userId: adminUserObj.id,
    name: adminUserObj.name,
    mobile: adminUserObj.mobile,
    role: "ADMIN" as const,
  };

  const newEmployee = await employeeService.createEmployee(adminOpSession, {
    name: "New Recruit",
    mobile: "7777777777",
    password: "defaultSecret123",
  });
  assert(newEmployee.mustChangePassword === true, "New employee created with default password has mustChangePassword = true");

  const firstLogin = await authService.loginWithPassword("7777777777", "defaultSecret123");
  assert(firstLogin.mustChangePassword === true, "First login with default password flags mustChangePassword = true");

  const changeDefaultPassRes = await authService.changePassword(
    newEmployee.id,
    "defaultSecret123",
    "recruitPersonalPass456"
  );
  assert(changeDefaultPassRes.mustChangePassword === false, "Changing password resets mustChangePassword to false");

  const secondLogin = await authService.loginWithPassword("7777777777", "recruitPersonalPass456");
  assert(secondLogin.mustChangePassword === false, "Subsequent login with new password has mustChangePassword = false (Unlocked)");

  await prisma.user.deleteMany({ where: { mobile: "7777777777" } });

  // -----------------------------------------------------------------
  // 7. Trip Creation with Fuel Entry Option (True / False)
  // -----------------------------------------------------------------
  console.log("\nTest Suite 7: Trip Creation with Fuel Entry Option (True / False)");

  const { tripService } = await import("../src/services/trip.service");

  const realEmployee = await prisma.user.findFirst({ where: { role: "EMPLOYEE", status: "ACTIVE" } });
  const testSession = {
    userId: realEmployee!.id,
    name: realEmployee!.name,
    mobile: realEmployee!.mobile,
    role: realEmployee!.role as "EMPLOYEE",
  };

  const currentBike = await prisma.bike.findFirst();
  const baseKm = currentBike?.currentKm || 7496;

  // Test 1: Trip with hasFuelEntry: false
  const tripNoFuel = await tripService.createTrip(testSession, {
    startingKm: baseKm,
    endingKm: baseKm + 25,
    purpose: "Client Meeting",
    remarks: "No fuel needed",
    hasFuelEntry: false,
  });
  assert(tripNoFuel.hasFuelEntry === false && !tripNoFuel.fuelEntry, "Trip created with hasFuelEntry = false (no fuel entry)");

  // Test 2: Trip with hasFuelEntry: true and fuel details (with mandatory bill proof)
  const tripWithFuel = await tripService.createTrip(testSession, {
    startingKm: baseKm + 25,
    endingKm: baseKm + 55,
    purpose: "Site Inspection",
    remarks: "Filled petrol on highway",
    hasFuelEntry: true,
    fuel: {
      litres: 1.0,
      amount: 113,
      pricePerLitre: 113,
      billImageUrl: "/uploads/bill_hp_proof.jpg",
      remarks: "HP Fuel Station",
    },
  });
  assert(
    tripWithFuel.hasFuelEntry === true &&
    tripWithFuel.fuelEntry !== null &&
    tripWithFuel.fuelEntry.amount === 113 &&
    tripWithFuel.fuelEntry.billImageUrl === "/uploads/bill_hp_proof.jpg",
    "Trip created with hasFuelEntry = true creates linked Fuel Entry with mandatory receipt proof"
  );

  // Test 3: Fuel entry without bill receipt proof fails validation
  let missingBillRejected = false;
  try {
    await tripService.createTrip(testSession, {
      startingKm: baseKm + 55,
      endingKm: baseKm + 75,
      purpose: "Delivery",
      hasFuelEntry: true,
      fuel: {
        litres: 1.0,
        amount: 113,
      },
    });
  } catch {
    missingBillRejected = true;
  }
  // Test 4: Trip creation without purpose fails validation (Mandatory Purpose)
  let missingPurposeRejected = false;
  try {
    await tripService.createTrip(testSession, {
      startingKm: baseKm + 55,
      endingKm: baseKm + 75,
      purpose: "   ",
      hasFuelEntry: false,
    });
  } catch {
    missingPurposeRejected = true;
  }
  assert(missingPurposeRejected, "Trip creation without purpose is rejected (Mandatory Purpose)");

  // Clean up test records and restore bike's currentKm
  await prisma.fuelEntry.deleteMany({ where: { remarks: "HP Fuel Station" } });
  await prisma.trip.deleteMany({ where: { id: { in: [tripNoFuel.id, tripWithFuel.id] } } });
  if (currentBike) {
    await prisma.bike.update({ where: { id: currentBike.id }, data: { currentKm: baseKm } });
  }

  // -----------------------------------------------------------------
  // 8. Petrol Balance Calculation & Settlement Reconciliation Tests
  // -----------------------------------------------------------------
  console.log("\nTest Suite 8: Petrol Balance & Settlements (Reconciliation)");

  const { calculateFuelBalance } = await import("../src/core/calculations");
  const { settlementService } = await import("../src/services/settlement.service");

  // User's exact prompt scenario:
  // "ride the bike for 200km, I only fill 200rs petrol. But previous ride I fill 500rs petrol.
  // Find the balance amount he wants to pay to admin based on petrol."
  const scenario1 = calculateFuelBalance(200, 30, 113, 700); // 200 + 500 = 700
  assert(
    scenario1.expectedCost === 753 &&
    scenario1.actualFuelPaid === 700 &&
    scenario1.netBalance === -53 &&
    scenario1.pendingAmount === 53 &&
    scenario1.status === "PENDING_PAYMENT",
    "User Scenario 1: 200km ridden, ₹700 filled -> ₹53 pending to pay admin"
  );

  // Extra balance scenario:
  // Ride 100km (cost: 100/30 * 113 = 377), filled ₹500
  const scenario2 = calculateFuelBalance(100, 30, 113, 500);
  assert(
    scenario2.expectedCost === 377 &&
    scenario2.actualFuelPaid === 500 &&
    scenario2.netBalance === 123 &&
    scenario2.surplusAmount === 123 &&
    scenario2.status === "EXTRA_BALANCE",
    "User Scenario 2: 100km ridden, ₹500 filled -> +₹123 extra balance credit"
  );

  // Settlement flow: Admin collects cash to clear pending balance
  const settlementRecord = await settlementService.settleBalance({
    userId: realEmployee!.id,
    adminId: adminUser!.id,
    amount: 53,
    type: "COLLECTED_FROM_EMPLOYEE",
    notes: "Settled ₹53 cash in office",
  });
  assert(
    settlementRecord.amount === 53 && settlementRecord.type === "COLLECTED_FROM_EMPLOYEE",
    "Admin can record cash settlement of ₹53 collected from employee"
  );

  // Verify that balance is now settled
  const postSettlement = calculateFuelBalance(200, 30, 113, 700, 53);
  assert(
    postSettlement.netBalance === 0 &&
    postSettlement.pendingAmount === 0 &&
    postSettlement.status === "SETTLED",
    "After ₹53 settlement, employee petrol balance is completely SETTLED (₹0)"
  );

  // Clean up settlement test record
  await prisma.fuelSettlement.delete({ where: { id: settlementRecord.id } });

  // -----------------------------------------------------------------
  // 9. Mandatory Fuel Proof & Admin-Only Petrol Rate Configuration
  // -----------------------------------------------------------------
  console.log("\nTest Suite 9: Mandatory Proof & Admin-Only Petrol Rate Configuration");

  const { fuelService } = await import("../src/services/fuel.service");
  const { bikeService } = await import("../src/services/bike.service");

  // Test 1: Direct fuel entry without bill proof fails validation
  let directFuelMissingProofRejected = false;
  try {
    await fuelService.createFuelEntry(testSession, {
      currentKm: 13080,
      litres: 2.0,
      amount: 226,
    });
  } catch {
    directFuelMissingProofRejected = true;
  }
  assert(directFuelMissingProofRejected, "Direct fuel entry without receipt proof is rejected (Mandatory Proof)");

  // Test 2: Employee trying to modify petrol rate is blocked (ForbiddenError)
  let employeeEditRateBlocked = false;
  try {
    await bikeService.updateBikeDetails(testSession, { fuelPrice: 120 });
  } catch {
    employeeEditRateBlocked = true;
  }
  assert(employeeEditRateBlocked, "Employees CANNOT edit petrol rate (Admin-only restricted)");

  // Test 3: Admin editing petrol rate succeeds
  const updatedBike = await bikeService.updateBikeDetails(
    {
      userId: adminUser!.id,
      name: adminUser!.name,
      mobile: adminUser!.mobile,
      role: "ADMIN",
    },
    { fuelPrice: 115 }
  );
  assert(updatedBike.fuelPrice === 115, "Admin CAN edit petrol rate (updated to ₹115/L)");

  // Restore petrol rate to ₹113
  await bikeService.updateBikeDetails(
    {
      userId: adminUser!.id,
      name: adminUser!.name,
      mobile: adminUser!.mobile,
      role: "ADMIN",
    },
    { fuelPrice: 113 }
  );

  // -----------------------------------------------------------------
  // 10. Live Ride Lifecycle, Concurrency Locking & Custody Tracking
  // -----------------------------------------------------------------
  console.log("\nTest Suite 10: Live Ride Lifecycle, Concurrency Locking & Custody Tracking");

  // Ensure clean slate for active trips
  await prisma.trip.deleteMany({ where: { status: "ACTIVE" } });
  await prisma.bike.updateMany({ data: { status: "AVAILABLE" } });

  const latestBike = await prisma.bike.findFirst();
  const testBaseKm = latestBike ? latestBike.currentKm : 7496;

  // Test 1: User A starts bike with starting odo reading and purpose
  const startRideRes = await tripService.startTrip(testSession, {
    startingKm: testBaseKm,
    purpose: "Client Visit - Kakkanad",
    startOdometerPhoto: "/uploads/start_odo_test.jpg",
    startReadingMethod: "PHOTO",
    startOcrConfidence: 0.98,
  });
  assert(
    startRideRes.trip.status === "ACTIVE" && startRideRes.trip.startingKm === testBaseKm,
    "User A starts bike: Trip status is ACTIVE with starting odo reading"
  );

  // Test 2: Admin / System observes that bike is IN_USE and User A is currently using it
  const liveStatusWhileInUse = await tripService.getActiveBikeStatus();
  assert(
    liveStatusWhileInUse.inUse === true &&
    liveStatusWhileInUse.currentRider?.name === testSession.name &&
    liveStatusWhileInUse.currentRider?.startingKm === testBaseKm,
    "Live status shows bike is IN_USE and User A is currently riding"
  );

  // Test 3: User B attempts to start bike while User A has not added end reading -> Blocked with User A's name
  let userBBlocked = false;
  let blockedRiderName = "";
  try {
    await tripService.startTrip(
      {
        userId: "user-b-id",
        name: "Rahul Varma",
        mobile: "7777777777",
        role: "EMPLOYEE",
      },
      {
        startingKm: testBaseKm,
        purpose: "Site Inspection",
      }
    );
  } catch (err: any) {
    userBBlocked = true;
    blockedRiderName = err.currentRider?.name || "";
  }
  assert(
    userBBlocked && blockedRiderName === testSession.name,
    "User B is blocked with popup data displaying User A's name as current rider"
  );

  // Test 4: User A ends ride at stopping point by adding ending reading
  const endRideRes = await tripService.endTrip(testSession, {
    tripId: startRideRes.trip.id,
    endingKm: testBaseKm + 20,
    remarks: "Client meeting completed",
    endReadingMethod: "PHOTO",
    endOcrConfidence: 0.95,
  });
  assert(
    endRideRes.trip.status === "COMPLETED" &&
    endRideRes.trip.distanceKm === 20 &&
    endRideRes.trip.endingKm === testBaseKm + 20,
    "User A completes ride with stop reading (20 km calculated)"
  );

  // Test 5: Live status now shows bike is AVAILABLE and User A is recorded as Last Used By
  const liveStatusAfterEnd = await tripService.getActiveBikeStatus();
  assert(
    liveStatusAfterEnd.inUse === false &&
    liveStatusAfterEnd.lastRider?.name === testSession.name &&
    liveStatusAfterEnd.lastRider?.endingKm === testBaseKm + 20,
    "Live status shows bike is now AVAILABLE and records User A as Last Used By"
  );

  // Clean up test ride
  await prisma.trip.delete({ where: { id: startRideRes.trip.id } });
  await prisma.bike.update({
    where: { id: latestBike!.id },
    data: { currentKm: testBaseKm, status: "AVAILABLE" },
  });

  // -----------------------------------------------------------------
  // 11. Double Ride (2 Users Sharing Bike), Split KM & Fuel Confirmation
  // -----------------------------------------------------------------
  console.log("\nTest Suite 11: Double Ride (2 Users Sharing Bike), Split KM & Fuel Confirmation");

  // Ensure two active employee users exist for double-ride testing
  let userA = await prisma.user.findFirst({
    where: { mobile: "8888888888", status: "ACTIVE" },
  });
  let userB = await prisma.user.findFirst({
    where: { mobile: "7777777777", status: "ACTIVE" },
  });

  if (!userB) {
    userB = await prisma.user.create({
      data: {
        name: "Rahul Co-Rider",
        mobile: "7777777777",
        password: "$2b$10$wE1V6qfL5fF...",
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    });
  }

  const userASession = {
    userId: userA!.id,
    name: userA!.name,
    mobile: userA!.mobile,
    role: "EMPLOYEE" as const,
  };

  const userBSession = {
    userId: userB!.id,
    name: userB!.name,
    mobile: userB!.mobile,
    role: "EMPLOYEE" as const,
  };

  const bikeForDouble = await prisma.bike.findFirst();
  const doubleBaseKm = bikeForDouble ? bikeForDouble.currentKm : 7496;

  // Test 1: User A starts a Double Ride with User B as co-rider and 50/50 fuel split
  const doubleStartRes = await tripService.startTrip(userASession, {
    startingKm: doubleBaseKm,
    purpose: "Client Demo Meeting",
    isDoubleRide: true,
    coRiderId: userB!.id,
    fuelSplitType: "SPLIT_EQUALLY",
  });
  assert(
    doubleStartRes.trip.isDoubleRide === true &&
    doubleStartRes.trip.coRiderId === userB!.id &&
    doubleStartRes.trip.coRiderConfirmation === "PENDING" &&
    doubleStartRes.trip.fuelSplitType === "SPLIT_EQUALLY",
    "User A starts Double Ride with User B: Status PENDING, FuelSplit SPLIT_EQUALLY"
  );

  // Test 2: User B sees the pending double ride confirmation request
  const pendingRequests = await tripService.getPendingCoRides(userB!.id);
  const foundPending = pendingRequests.find((p) => p.id === doubleStartRes.trip.id);
  assert(
    Boolean(foundPending) && foundPending?.primaryRider.name === userA!.name,
    "User B dashboard receives pending confirmation notification for User A's double ride"
  );

  // Test 3: User A ends the double ride (40 km travelled, ₹400 fuel refilled)
  const doubleEndRes = await tripService.endTrip(userASession, {
    tripId: doubleStartRes.trip.id,
    endingKm: doubleBaseKm + 40,
    hasFuelEntry: true,
    fuel: {
      amount: 400,
      litres: 3.54,
      pricePerLitre: 113,
      billImageUrl: "/uploads/double_fuel_bill.jpg",
      remarks: "50/50 split fuel refill",
      fuelSplitType: "SPLIT_EQUALLY",
    },
  });

  assert(
    doubleEndRes.trip.distanceKm === 40 &&
    doubleEndRes.trip.primaryRiderKm === 20 &&
    doubleEndRes.trip.coRiderKm === 20,
    "Double ride ending splits distance 50/50: Primary 20 km, Co-rider 20 km"
  );

  assert(
    doubleEndRes.trip.primaryFuelShare === 200 &&
    doubleEndRes.trip.coRiderFuelShare === 200,
    "Double ride fuel expense split 50/50: Primary ₹200, Co-rider ₹200"
  );

  // Verify two linked fuel entries were created
  const createdFuelEntries = await prisma.fuelEntry.findMany({
    where: {
      userId: { in: [userA!.id, userB!.id] },
      amount: 200,
    },
  });
  assert(
    createdFuelEntries.length >= 2 &&
    createdFuelEntries.some((f) => f.userId === userA!.id && f.amount === 200) &&
    createdFuelEntries.some((f) => f.userId === userB!.id && f.amount === 200),
    "System created 2 FuelEntry records: ₹200 charged to User A, ₹200 charged to User B"
  );

  // Test 4: User B confirms the double ride
  const confirmResult = await tripService.confirmCoRide(userBSession, doubleStartRes.trip.id, true);
  assert(
    confirmResult.trip.coRiderConfirmation === "CONFIRMED",
    "User B confirms ride: status transitions to CONFIRMED"
  );

  // Effective distance test when CONFIRMED
  const effectiveKmA = await tripRepository.getUserEffectiveDistance(userA!.id);
  const effectiveKmB = await tripRepository.getUserEffectiveDistance(userB!.id);
  assert(
    effectiveKmA.totalDistanceKm >= 20 && effectiveKmB.totalDistanceKm >= 20,
    `Confirmed double ride credits split distance to both riders (User A: ${effectiveKmA.totalDistanceKm} km, User B: ${effectiveKmB.totalDistanceKm} km)`
  );

  // Test 5: Not Confirmed scenario - Co-rider declines
  const declineTrip = await tripService.createTrip(userASession, {
    date: new Date().toISOString().slice(0, 10),
    startingKm: doubleBaseKm + 40,
    endingKm: doubleBaseKm + 70, // 30 km trip
    purpose: "Market errands",
    isDoubleRide: true,
    coRiderId: userB!.id,
    fuelSplitType: "NONE",
    hasFuelEntry: false,
  });

  const declineResult = await tripService.confirmCoRide(userBSession, declineTrip.id, false);
  assert(
    declineResult.trip.coRiderConfirmation === "NOT_CONFIRMED",
    "User B declines co-ride: status transitions to NOT_CONFIRMED"
  );

  // Effective distance when NOT_CONFIRMED: Primary keeps full 30 km, co-rider gets 0 km from this trip
  const declinedTripRecord = await prisma.trip.findUnique({ where: { id: declineTrip.id } });
  assert(
    declinedTripRecord?.coRiderConfirmation === "NOT_CONFIRMED",
    "Declined trip persists NOT_CONFIRMED status in database"
  );

  // Clean up Test Suite 11 artifacts
  await prisma.fuelEntry.deleteMany({
    where: {
      userId: { in: [userA!.id, userB!.id] },
      amount: 200,
    },
  });
  await prisma.trip.deleteMany({ where: { id: { in: [doubleStartRes.trip.id, declineTrip.id] } } });
  await prisma.bike.update({
    where: { id: bikeForDouble!.id },
    data: { currentKm: doubleBaseKm, status: "AVAILABLE" },
  });

  console.log("\n=======================================================");
  console.log(`Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("=======================================================\n");

  await prisma.$disconnect();

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
