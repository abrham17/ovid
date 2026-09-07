import { db } from "@/lib/db";
import { AuditAction } from "@/generated/prisma/enums";

export interface RecordAuditLogParams {
  userId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  diff?: Record<string, any> | null;
  reason?: string;
  authority?: string;
}

export async function recordAuditLog(params: RecordAuditLogParams, tx?: any) {
  const prismaClient = tx || db;
  const diffPayload = params.diff || {
    before: params.before ?? null,
    after: params.after ?? null,
    reason: params.reason ?? null,
    authority: params.authority ?? null,
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
