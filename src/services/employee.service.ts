import bcrypt from "bcryptjs";
import { userRepository } from "@/repositories/user.repository";
import { auditRepository } from "@/repositories/audit.repository";
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from "@/core/errors";
import { UserSession } from "@/lib/auth";

import { bikeRepository } from "@/repositories/bike.repository";
import { calculateFuelBalance } from "@/core/calculations";

export class EmployeeService {
  async listEmployees(session: UserSession) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can view staff rosters.");
    }
    const [employees, bike] = await Promise.all([
      userRepository.findAll(),
      bikeRepository.getPrimaryBike(),
    ]);

    const mileage = bike?.mileageTarget || 30.0;
    const price = bike?.fuelPrice || 113.0;

    return (employees as any[]).map((emp) => {
      const totalKm = (emp.trips || []).reduce((acc: number, t: any) => acc + t.distanceKm, 0);
      const fuelCost = (emp.fuelEntries || []).reduce((acc: number, f: any) => acc + f.amount, 0);
      const settlementsOffset = (emp.fuelSettlements || []).reduce((acc: number, s: any) => acc + s.amount, 0);
      const fuelBalance = calculateFuelBalance(totalKm, mileage, price, fuelCost, settlementsOffset);

      return {
        ...emp,
        fuelBalance,
      };
    });
  }

  async createEmployee(session: UserSession, data: {
    name: string;
    mobile: string;
    email?: string | null;
    role?: string;
    status?: string;
    password?: string;
  }) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can add staff members.");
    }

    const name = (data.name || "").trim();
    let mobile = (data.mobile || "").toString().trim().replace(/[^0-9]/g, "");
    if (mobile.length === 12 && mobile.startsWith("91")) mobile = mobile.slice(2);
    const email = data.email ? data.email.trim() : null;
    const role = data.role === "ADMIN" ? "ADMIN" : "EMPLOYEE";
    const status = data.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    const plainPassword = (data.password || "").trim() || "welcome123";
    if (plainPassword.length < 6) {
      throw new ValidationError("Default password must be at least 6 characters long.");
    }

    if (!name) {
      throw new ValidationError("Please enter the employee's full name.");
    }
    if (!mobile || mobile.length !== 10) {
      throw new ValidationError("Please enter a valid 10-digit mobile number.");
    }

    const existing = await userRepository.findByMobile(mobile);
    if (existing) {
      throw new ConflictError("An employee with this mobile number already exists.");
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const employee = await userRepository.create({
      name,
      mobile,
      email,
      role,
      status,
      password: hashedPassword,
      mustChangePassword: true, // Forces employee to change password on first login
    });

    await auditRepository.recordLog(
      session.userId,
      "CREATE_EMPLOYEE",
      "USER",
      employee.id,
      `Admin added ${employee.name} (${employee.role}, ${employee.mobile}) with default password (change required)`
    );

    return employee;
  }

  async updateEmployee(session: UserSession, id: string, data: {
    name?: string;
    mobile?: string;
    email?: string | null;
    role?: string;
    status?: string;
    password?: string;
  }) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can modify staff records.");
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Employee not found.");
    }

    let mobile = existing.mobile;
    if (data.mobile) {
      mobile = data.mobile.toString().trim().replace(/[^0-9]/g, "");
      if (mobile.length === 12 && mobile.startsWith("91")) mobile = mobile.slice(2);
      if (mobile.length !== 10) {
        throw new ValidationError("Please enter a valid 10-digit mobile number.");
      }

      if (mobile !== existing.mobile) {
        const dup = await userRepository.findByMobile(mobile);
        if (dup) {
          throw new ConflictError("Another user already has this mobile number.");
        }
      }
    }

    let updatedPasswordHash: string | undefined;
    let mustChangePassword: boolean | undefined;

    if (data.password && data.password.trim()) {
      if (data.password.trim().length < 6) {
        throw new ValidationError("Password must be at least 6 characters long.");
      }
      updatedPasswordHash = await bcrypt.hash(data.password.trim(), 10);
      mustChangePassword = true; // Resetting password forces employee to set their own password
    }

    const updatePayload: any = {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      mobile,
      email: data.email !== undefined ? data.email?.trim() || null : existing.email,
      role: data.role || existing.role,
      status: data.status || existing.status,
    };

    if (updatedPasswordHash) {
      updatePayload.password = updatedPasswordHash;
      updatePayload.mustChangePassword = mustChangePassword;
    }

    const updated = await userRepository.update(id, updatePayload);

    await auditRepository.recordLog(
      session.userId,
      "UPDATE_EMPLOYEE",
      "USER",
      id,
      `Admin updated employee ${updated.name} (Role: ${updated.role}, Status: ${updated.status}${updatedPasswordHash ? ", password reset" : ""})`
    );

    return updated;
  }

  async deleteEmployee(session: UserSession, id: string) {
    if (session.role !== "ADMIN") {
      throw new ForbiddenError("Only Administrators can delete staff records.");
    }

    if (session.userId === id) {
      throw new ValidationError("You cannot delete your own admin account.");
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Employee not found.");
    }

    await userRepository.delete(id);

    await auditRepository.recordLog(
      session.userId,
      "DELETE_EMPLOYEE",
      "USER",
      id,
      `Admin deleted employee ${existing.name} (${existing.mobile})`
    );

    return { success: true };
  }
}

export const employeeService = new EmployeeService();
