import { prisma } from "./prisma";

export async function recordAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || null,
        details: details || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}
