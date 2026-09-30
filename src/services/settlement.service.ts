import { settlementRepository } from "../repositories/settlement.repository";
import { auditRepository } from "../repositories/audit.repository";
import { userRepository } from "../repositories/user.repository";
import { ValidationError, NotFoundError } from "../core/errors";

export class SettlementService {
  async settleBalance(data: {
    userId: string;
    adminId?: string;
    amount: number;
    type: "COLLECTED_FROM_EMPLOYEE" | "REIMBURSED_TO_EMPLOYEE" | "BALANCE_CLEAR";
    notes?: string;
  }) {
    if (!data.userId) {
      throw new ValidationError("User ID is required.");
    }
    if (!data.amount || data.amount === 0) {
      throw new ValidationError("Settlement amount cannot be zero.");
    }

    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundError("Employee not found.");
    }

    // If type is REIMBURSED_TO_EMPLOYEE, company is paying the employee back their extra credit,
    // so it reduces their credit (negative offset)
    const effectiveAmount =
      data.type === "REIMBURSED_TO_EMPLOYEE" ? -Math.abs(data.amount) : Math.abs(data.amount);

    const record = await settlementRepository.create({
      userId: data.userId,
      adminId: data.adminId,
      amount: effectiveAmount,
      type: data.type,
      notes: data.notes,
    });

    await auditRepository.recordLog(
      data.adminId || null,
      "CREATE_SETTLEMENT",
      "FUEL_SETTLEMENT",
      record.id,
      JSON.stringify({
        employeeName: user.name,
        amount: data.amount,
        type: data.type,
        notes: data.notes,
      })
    );

    return record;
  }

  async getSettlementsByUser(userId: string) {
    return settlementRepository.findByUserId(userId);
  }

  async getAllSettlements(limit = 50) {
    return settlementRepository.findAll(limit);
  }
}

export const settlementService = new SettlementService();
