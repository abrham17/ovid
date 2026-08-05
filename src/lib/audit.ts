import { db } from "@/lib/db";
import type { AuditAction } from "@/generated/prisma/enums";

/**
 * Writes an AuditLog entry (file 07 §14.3). Non-blocking: failures to audit
 * must never abort the primary mutation, so callers should await it but the
 * helper swallows errors.
 */
export async function audit(opts: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  diff?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        userId: opts.userId,
        diff: opts.diff === undefined ? undefined : JSON.parse(JSON.stringify(opts.diff)),
      },
    });
  } catch {
    // ignore audit failures
  }
}
