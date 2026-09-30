import { prisma } from "@/lib/prisma";

export class AuditRepository {
  async recordLog(
    userId: string | null,
    action: string,
    entityType: string,
    entityId?: string | null,
    details?: string | null
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId: entityId || null,
          details: details || null,
        },
      });
    } catch (err) {
      console.error("Failed to persist audit log:", err);
    }
  }

  async findRecent(limit = 30) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, mobile: true, role: true } },
      },
    });
  }
}

export const auditRepository = new AuditRepository();
