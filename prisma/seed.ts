import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting BikeTrack database seeding with passwords...");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const employeePasswordHash = await bcrypt.hash("emp123", 10);

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.fuelEntry.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.bike.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Company Bike
  const bike = await prisma.bike.create({
    data: {
      name: "Company Bike",
      registrationNumber: "KL 07 AB 1234",
      currentKm: 12550,
      fuelType: "Petrol",
      mileageTarget: 45.0,
      status: "AVAILABLE",
    },
  });
  console.log(`✓ Created Bike: ${bike.name} (${bike.registrationNumber})`);

  // 2. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      mobile: "9999999999",
      email: "admin@biketrack.local",
      password: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Created Admin: ${admin.name} (${admin.mobile}) - Password: admin123`);

  // 3. Seed Primary Employee (Sanjay Kumar)
  const sanjay = await prisma.user.create({
    data: {
      name: "Sanjay Kumar",
      mobile: "8888888888",
      email: "sanjay@company.com",
      password: employeePasswordHash,
      role: "EMPLOYEE",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Created Employee: ${sanjay.name} (${sanjay.mobile}) - Password: emp123`);

  // 4. Seed Additional 9 Employees
  const employeeNames = [
    { name: "Azeem", mobile: "9000000001", email: "azeem@company.com" },
    { name: "Alan", mobile: "9000000002", email: "alan@company.com" },
    { name: "Vishnu", mobile: "9000000003", email: "vishnu@company.com" },
    { name: "Rahul", mobile: "9000000004", email: "rahul@company.com" },
    { name: "Deepak", mobile: "9000000005", email: "deepak@company.com" },
    { name: "Nikhil", mobile: "9000000006", email: "nikhil@company.com" },
    { name: "Arjun", mobile: "9000000007", email: "arjun@company.com" },
    { name: "Manu", mobile: "9000000008", email: "manu@company.com" },
    { name: "Bibin", mobile: "9000000009", email: "bibin@company.com" },
  ];

  const createdEmployees = [];
  for (const emp of employeeNames) {
    const user = await prisma.user.create({
      data: {
        name: emp.name,
        mobile: emp.mobile,
        email: emp.email,
        password: employeePasswordHash,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    });
    createdEmployees.push(user);
  }

  // Also create 1 Inactive user for testing rule 8
  await prisma.user.create({
    data: {
      name: "Rohan Mehta",
      mobile: "9000000099",
      email: "rohan@company.com",
      password: employeePasswordHash,
      role: "EMPLOYEE",
      status: "INACTIVE",
    },
  });
  console.log(`✓ Seeded ${createdEmployees.length + 2} total users (including admin & inactive test user)`);

  // 5. Seed Realistic Trips
  // Sanjay's trips
  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  const sanjayTrips = [
    { date: daysAgo(1), start: 12530, end: 12550, dist: 20, purpose: "Client Visit", remarks: "Met with Tech Corp" },
    { date: daysAgo(2), start: 12505, end: 12530, dist: 25, purpose: "Office Work", remarks: "Document submission" },
    { date: daysAgo(4), start: 12480, end: 12505, dist: 25, purpose: "Site Visit", remarks: "Inspection at site B" },
    { date: daysAgo(6), start: 12450, end: 12470, dist: 20, purpose: "Client Visit", remarks: "Client meeting" },
    { date: daysAgo(9), start: 12420, end: 12450, dist: 30, purpose: "Market", remarks: "Hardware supplies" },
    { date: daysAgo(12), start: 12390, end: 12410, dist: 20, purpose: "Bank", remarks: "Cheque deposit" },
    { date: daysAgo(15), start: 12350, end: 12380, dist: 30, purpose: "Meeting", remarks: "Partner discussion" },
    { date: daysAgo(18), start: 12340, end: 12350, dist: 10, purpose: "Office Work", remarks: "Courier delivery" },
  ];

  for (const t of sanjayTrips) {
    await prisma.trip.create({
      data: {
        userId: sanjay.id,
        bikeId: bike.id,
        date: t.date,
        startingKm: t.start,
        endingKm: t.end,
        distanceKm: t.dist,
        purpose: t.purpose,
        remarks: t.remarks,
      },
    });
  }

  // Azeem's trips
  const azeem = createdEmployees[0];
  const azeemTrips = [
    { date: daysAgo(3), start: 12470, end: 12480, dist: 10, purpose: "Bank", remarks: "Account verification" },
    { date: daysAgo(7), start: 12410, end: 12420, dist: 10, purpose: "Site Visit", remarks: "Safety check" },
    { date: daysAgo(11), start: 12380, end: 12390, dist: 10, purpose: "Office Work", remarks: "Stationery" },
  ];
  for (const t of azeemTrips) {
    await prisma.trip.create({
      data: {
        userId: azeem.id,
        bikeId: bike.id,
        date: t.date,
        startingKm: t.start,
        endingKm: t.end,
        distanceKm: t.dist,
        purpose: t.purpose,
        remarks: t.remarks,
      },
    });
  }

  // Alan's trips
  const alan = createdEmployees[1];
  const alanTrips = [
    { date: daysAgo(5), start: 12420, end: 12440, dist: 20, purpose: "Client Visit", remarks: "Quotation handoff" },
    { date: daysAgo(8), start: 12390, end: 12410, dist: 20, purpose: "Market", remarks: "Printer ink" },
    { date: daysAgo(14), start: 12330, end: 12340, dist: 10, purpose: "Office Work", remarks: "Office keys" },
  ];
  for (const t of alanTrips) {
    await prisma.trip.create({
      data: {
        userId: alan.id,
        bikeId: bike.id,
        date: t.date,
        startingKm: t.start,
        endingKm: t.end,
        distanceKm: t.dist,
        purpose: t.purpose,
        remarks: t.remarks,
      },
    });
  }

  console.log("✓ Seeded realistic trips for employees");

  // 6. Seed Realistic Fuel Entries
  const fuelEntries = [
    {
      userId: sanjay.id,
      date: daysAgo(10),
      currentKm: 12400,
      litres: 5.0,
      amount: 520.0,
      pricePerLitre: 104.0,
      remarks: "Shell Petrol Pump - Full tank refill",
    },
    {
      userId: sanjay.id,
      date: daysAgo(2),
      currentKm: 12510,
      litres: 6.5,
      amount: 677.0,
      pricePerLitre: 104.15,
      remarks: "BPCL bunk - Office visit refill",
    },
    {
      userId: azeem.id,
      date: daysAgo(16),
      currentKm: 12340,
      litres: 4.8,
      amount: 500.0,
      pricePerLitre: 104.16,
      remarks: "HPCL bunk",
    },
    {
      userId: alan.id,
      date: daysAgo(22),
      currentKm: 12250,
      litres: 5.5,
      amount: 572.0,
      pricePerLitre: 104.0,
      remarks: "Indian Oil bunk",
    },
  ];

  for (const f of fuelEntries) {
    await prisma.fuelEntry.create({
      data: {
        userId: f.userId,
        bikeId: bike.id,
        date: f.date,
        currentKm: f.currentKm,
        litres: f.litres,
        amount: f.amount,
        pricePerLitre: Number(f.pricePerLitre.toFixed(2)),
        remarks: f.remarks,
      },
    });
  }
  console.log("✓ Seeded realistic fuel entries");

  // 7. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "INITIALIZE_SYSTEM",
        entityType: "SYSTEM",
        details: "BikeTrack database initialized with company bike KL 07 AB 1234",
      },
      {
        userId: sanjay.id,
        action: "CREATE_TRIP",
        entityType: "TRIP",
        details: "Sanjay recorded 20 km trip for Client Visit",
      },
      {
        userId: sanjay.id,
        action: "CREATE_FUEL",
        entityType: "FUEL_ENTRY",
        details: "Sanjay logged 6.5L fuel refill of ₹677",
      },
    ],
  });
  console.log("✓ Seeded initial audit logs");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("==========================================");
  console.log("Admin Mobile:    9999999999 (DEV OTP: 123456)");
  console.log("Employee Mobile: 8888888888 (DEV OTP: 123456)");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
