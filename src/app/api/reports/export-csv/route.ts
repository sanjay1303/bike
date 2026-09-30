import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAdminRequest } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await authenticateAdminRequest(req);
  if (errorResponse || !session) return errorResponse;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "trips";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasDateFilter = startDate || endDate;

  try {
    let csvContent = "";
    let filename = `biketrack_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === "trips") {
      const trips = await prisma.trip.findMany({
        where: hasDateFilter ? { date: dateFilter } : {},
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { date: "desc" },
      });

      const headers = ["Trip ID", "Date", "Employee", "Mobile", "Starting KM", "Ending KM", "Distance (KM)", "Purpose", "Remarks"];
      const rows = trips.map((t) => [
        t.id,
        new Date(t.date).toISOString().slice(0, 10),
        `"${t.user.name}"`,
        t.user.mobile,
        t.startingKm,
        t.endingKm,
        t.distanceKm,
        `"${t.purpose}"`,
        `"${(t.remarks || "").replace(/"/g, '""')}"`,
      ]);

      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (type === "fuel") {
      const fuelEntries = await prisma.fuelEntry.findMany({
        where: hasDateFilter ? { date: dateFilter } : {},
        include: { user: { select: { name: true, mobile: true } } },
        orderBy: { date: "desc" },
      });

      const headers = ["Fuel ID", "Date", "Employee", "Mobile", "Odometer KM", "Litres", "Amount (₹)", "Price Per Litre (₹)", "Remarks"];
      const rows = fuelEntries.map((f) => [
        f.id,
        new Date(f.date).toISOString().slice(0, 10),
        `"${f.user.name}"`,
        f.user.mobile,
        f.currentKm,
        f.litres,
        f.amount,
        f.pricePerLitre,
        `"${(f.remarks || "").replace(/"/g, '""')}"`,
      ]);

      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (type === "employee_summary") {
      const employees = await prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        include: {
          trips: hasDateFilter ? { where: { date: dateFilter } } : true,
          fuelEntries: hasDateFilter ? { where: { date: dateFilter } } : true,
        },
      });

      const headers = ["Employee Name", "Mobile", "Status", "Total Trips", "Total Distance (KM)", "Total Fuel Amount (₹)", "Total Fuel Litres"];
      const rows = employees.map((e) => {
        const totalDist = e.trips.reduce((acc, t) => acc + t.distanceKm, 0);
        const totalAmount = e.fuelEntries.reduce((acc, f) => acc + f.amount, 0);
        const totalLitres = e.fuelEntries.reduce((acc, f) => acc + f.litres, 0);
        return [
          `"${e.name}"`,
          e.mobile,
          e.status,
          e.trips.length,
          totalDist,
          totalAmount,
          totalLitres.toFixed(1),
        ];
      });

      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("CSV Export error:", error);
    return NextResponse.json({ error: "Failed to generate CSV export." }, { status: 500 });
  }
}
