import { db } from "@/lib/db";
import type { AuditAction, UserRole } from "@/generated/prisma/enums";

export interface AuditLogOptions {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  userRole?: UserRole;
  projectId?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  diff?: unknown;
}

/**
 * Writes a comprehensive AuditLog entry with user role, project scoping,
 * typed justification reason, and JSON diffs.
 */
export async function audit(opts: AuditLogOptions) {
  try {
    await db.auditLog.create({
      data: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        userId: opts.userId,
        userRole: opts.userRole,
        projectId: opts.projectId,
        reason: opts.reason,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
        diff: opts.diff === undefined ? undefined : JSON.parse(JSON.stringify(opts.diff)),
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

/**
 * Validates that sensitive financial, schedule, or structural operations
 * include a mandatory typed justification reason.
 */
export function validateAuditReason(reason?: string | null): string {
  if (!reason || reason.trim().length < 10) {
    throw new Error(
      "AUDIT_REASON_REQUIRED: A valid typed justification reason (minimum 10 characters) is required for this operation under ISO 9001 governance."
    );
  }
  return reason.trim();
}
