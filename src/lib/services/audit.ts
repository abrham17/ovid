import { db } from "@/lib/db";
import { AuditAction } from "@/generated/prisma";

export interface RecordAuditLogParams {
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  diff?: Record<string, any> | null;
}

export async function recordAuditLog(params: RecordAuditLogParams, tx?: any) {
  const prismaClient = tx || db;
  const diffPayload = params.diff || {
    before: params.before ?? null,
    after: params.after ?? null,
  };

  return await prismaClient.auditLog.create({
    data: {
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      diff: diffPayload,
    },
  });
}
