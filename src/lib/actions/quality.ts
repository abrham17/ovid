"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty, canRecordItr, canLogDefect, canCloseDefect, canManagePunchList } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { ITRResult, PunchSeverity } from "@/generated/prisma/enums";

async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may modify quality records.");
  }
  return party;
}

// ---------------------------------------------------------------
// Inspection & Test Records (ITR)
// ---------------------------------------------------------------

const itrSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  inspectionType: z.string().min(2),
  result: z.enum(["PASS", "FAIL"]),
  inspectedAt: z.coerce.date(),
});

export async function createItr(formData: FormData) {
  const user = await requireUser();
  const parsed = itrSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    inspectionType: formData.get("inspectionType"),
    result: formData.get("result"),
    inspectedAt: formData.get("inspectedAt") || new Date(),
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordItr(user.role)) {
    throw new Error("Your role is not authorized to record inspections.");
  }

  const itr = await db.inspectionTestRecord.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      inspectionType: parsed.inspectionType,
      result: parsed.result as ITRResult,
      inspectedByUserId: user.id,
      inspectedAt: parsed.inspectedAt,
    },
  });
  await audit({ userId: user.id, entityType: "InspectionTestRecord", entityId: itr.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/quality`);
}

// ---------------------------------------------------------------
// Defect log — rework cost feeds CostActual, delay feeds schedule
// ---------------------------------------------------------------

const defectSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  linkedItrId: z.string().optional(),
  description: z.string().min(3),
  responsibleOrgId: z.string().optional(),
  reworkCost: z.coerce.number().nonnegative().optional(),
  reworkDelayDays: z.coerce.number().int().min(0).optional(),
});

export async function logDefect(formData: FormData) {
  const user = await requireUser();
  const parsed = defectSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    linkedItrId: formData.get("linkedItrId") || undefined,
    description: formData.get("description"),
    responsibleOrgId: formData.get("responsibleOrgId") || undefined,
    reworkCost: formData.get("reworkCost") || undefined,
    reworkDelayDays: formData.get("reworkDelayDays") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canLogDefect(user.role)) {
    throw new Error("Your role is not authorized to log defects.");
  }

  const defect = await db.defectLog.create({
    data: {
      linkedItrId: parsed.linkedItrId,
      wbsNodeId: parsed.wbsNodeId,
      description: parsed.description,
      responsibleOrgId: parsed.responsibleOrgId,
      reworkDelayDays: parsed.reworkDelayDays,
      status: "OPEN",
    },
  });

  // Feed rework cost into the cost module (if the WBS node has a BoQ item).
  let reworkCostActualId: string | null = null;
  if (parsed.reworkCost && parsed.reworkCost > 0) {
    const boq = await db.boqItem.findFirst({ where: { wbsNodeId: parsed.wbsNodeId } });
    if (boq) {
      const actual = await db.costActual.create({
        data: {
          boqItemId: boq.id,
          costType: "ACTUAL",
          amount: parsed.reworkCost,
          sourceType: "INVOICE",
          sourceId: `DEF-${defect.id.slice(0, 8)}`,
          recordedAt: new Date(),
        },
      });
      reworkCostActualId = actual.id;
      await db.defectLog.update({
        where: { id: defect.id },
        data: { reworkCostActualId },
      });
    }
  }

  await audit({ userId: user.id, entityType: "DefectLog", entityId: defect.id, action: "CREATE", diff: { ...parsed, reworkCostActualId } });
  revalidatePath(`/projects/${parsed.projectId}/quality`);
}

export async function closeDefect(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId"));
  const defectId = String(formData.get("defectId"));
  await requireContractor(user, projectId);
  if (!canCloseDefect(user.role)) {
    throw new Error("Your role is not authorized to close defects.");
  }

  await db.defectLog.update({ where: { id: defectId }, data: { status: "VERIFIED_CLOSED" } });
  await audit({ userId: user.id, entityType: "DefectLog", entityId: defectId, action: "UPDATE", diff: { status: "VERIFIED_CLOSED" } });
  revalidatePath(`/projects/${projectId}/quality`);
}

// ---------------------------------------------------------------
// Punch list — unit-level patternTag surfaces systemic defects
// ---------------------------------------------------------------

  const punchSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  description: z.string().min(3),
  severity: z.enum(["MINOR", "MAJOR"]),
  patternTag: z.string().optional(),
});

export async function createPunchItem(formData: FormData) {
  const user = await requireUser();
  const parsed = punchSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    description: formData.get("description"),
    severity: formData.get("severity"),
    patternTag: formData.get("patternTag") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canManagePunchList(user.role)) {
    throw new Error("Your role is not authorized to manage the punch list.");
  }

  const item = await db.punchListItem.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      description: parsed.description,
      severity: parsed.severity as PunchSeverity,
      patternTag: parsed.patternTag,
      status: "OPEN",
    },
  });
  await audit({ userId: user.id, entityType: "PunchListItem", entityId: item.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/quality`);
}

export async function closePunchItem(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId"));
  const itemId = String(formData.get("itemId"));
  await requireContractor(user, projectId);
  if (!canManagePunchList(user.role)) {
    throw new Error("Your role is not authorized to close punch items.");
  }

  await db.punchListItem.update({ where: { id: itemId }, data: { status: "RESOLVED" } });
  await audit({ userId: user.id, entityType: "PunchListItem", entityId: itemId, action: "UPDATE", diff: { status: "RESOLVED" } });
  revalidatePath(`/projects/${projectId}/quality`);
}
