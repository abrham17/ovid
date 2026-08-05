"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty, canEnterDailyReport, canSignOffDailyReport, DAILY_SIGN_OFF_CHAIN } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { SignOffRole } from "@/generated/prisma/enums";

const ROLE_TO_SIGNOFF: Record<string, SignOffRole> = {
  FOREMAN: "FOREMAN",
  SUPERINTENDENT: "SUPERINTENDENT",
  DEPUTY_PM: "DEPUTY_PM",
  SENIOR_PM: "SENIOR_PM",
};

async function requireContractorEntryRole(user: SessionUser, projectId: string) {
  if (!canEnterDailyReport(user.role as never)) {
    throw new Error("Only Foremen and Site Engineers may enter daily site reports.");
  }
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may enter daily site reports.");
  }
  return party;
}

const commonFields = {
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  date: z.coerce.date(),
  remark: z.string().optional(),
};

// ------------------------------------------------------------
// Earth Work Daily Report Format — IMS/OF/ENG/018
// ------------------------------------------------------------

const earthworkSchema = z.object({
  ...commonFields,
  station: z.string().optional(),
  activityDescription: z.string().min(2),
  equipmentType: z.string().optional(),
  equipmentPlateNo: z.string().optional(),
  operatingHours: z.coerce.number().nonnegative().optional(),
  idleHours: z.coerce.number().nonnegative().optional(),
  downHours: z.coerce.number().nonnegative().optional(),
  quantityLength: z.coerce.number().optional(),
  quantityWidth: z.coerce.number().optional(),
  quantityDepth: z.coerce.number().optional(),
});

export async function createEarthworkEntry(formData: FormData) {
  const user = await requireUser();
  const parsed = earthworkSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    date: formData.get("date"),
    station: formData.get("station") || undefined,
    activityDescription: formData.get("activityDescription"),
    equipmentType: formData.get("equipmentType") || undefined,
    equipmentPlateNo: formData.get("equipmentPlateNo") || undefined,
    operatingHours: formData.get("operatingHours") || undefined,
    idleHours: formData.get("idleHours") || undefined,
    downHours: formData.get("downHours") || undefined,
    quantityLength: formData.get("quantityLength") || undefined,
    quantityWidth: formData.get("quantityWidth") || undefined,
    quantityDepth: formData.get("quantityDepth") || undefined,
    remark: formData.get("remark") || undefined,
  });
  await requireContractorEntryRole(user, parsed.projectId);

  const entry = await db.earthworkDailyEntry.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      date: parsed.date,
      station: parsed.station,
      activityDescription: parsed.activityDescription,
      equipmentType: parsed.equipmentType,
      equipmentPlateNo: parsed.equipmentPlateNo,
      operatingHours: parsed.operatingHours,
      idleHours: parsed.idleHours,
      downHours: parsed.downHours,
      quantityLength: parsed.quantityLength,
      quantityWidth: parsed.quantityWidth,
      quantityDepth: parsed.quantityDepth,
      remark: parsed.remark,
      createdById: user.id,
      status: "DRAFT",
    },
  });
  await audit({ userId: user.id, entityType: "EarthworkDailyEntry", entityId: entry.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/daily`);
}

// ------------------------------------------------------------
// Structure Daily Report Format — IMS/001
// ------------------------------------------------------------

const structureSchema = z.object({
  ...commonFields,
  activityDescription: z.string().min(2),
  designQuantity: z.coerce.number().optional(),
  actualQuantity: z.coerce.number().optional(),
  materialUsed: z.string().optional(),
  concreteGrade: z.string().optional(),
  equipmentType: z.string().optional(),
  equipmentSerialNo: z.string().optional(),
  operatingHours: z.coerce.number().nonnegative().optional(),
  idleHours: z.coerce.number().nonnegative().optional(),
  downHours: z.coerce.number().nonnegative().optional(),
});

export async function createStructureEntry(formData: FormData) {
  const user = await requireUser();
  const parsed = structureSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    date: formData.get("date"),
    activityDescription: formData.get("activityDescription"),
    designQuantity: formData.get("designQuantity") || undefined,
    actualQuantity: formData.get("actualQuantity") || undefined,
    materialUsed: formData.get("materialUsed") || undefined,
    concreteGrade: formData.get("concreteGrade") || undefined,
    equipmentType: formData.get("equipmentType") || undefined,
    equipmentSerialNo: formData.get("equipmentSerialNo") || undefined,
    operatingHours: formData.get("operatingHours") || undefined,
    idleHours: formData.get("idleHours") || undefined,
    downHours: formData.get("downHours") || undefined,
    remark: formData.get("remark") || undefined,
  });
  await requireContractorEntryRole(user, parsed.projectId);

  const entry = await db.structureDailyEntry.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      date: parsed.date,
      activityDescription: parsed.activityDescription,
      designQuantity: parsed.designQuantity,
      actualQuantity: parsed.actualQuantity,
      materialUsed: parsed.materialUsed,
      concreteGrade: parsed.concreteGrade,
      equipmentType: parsed.equipmentType,
      equipmentSerialNo: parsed.equipmentSerialNo,
      operatingHours: parsed.operatingHours,
      idleHours: parsed.idleHours,
      downHours: parsed.downHours,
      remark: parsed.remark,
      createdById: user.id,
      status: "DRAFT",
    },
  });
  await audit({ userId: user.id, entityType: "StructureDailyEntry", entityId: entry.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/daily`);
}

// ------------------------------------------------------------
// Bar Schedule (Rebar) Daily Report — IMS/OF/ENG/019
// Weight auto-computed from WeightFactor lookup.
// ------------------------------------------------------------

const rebarSchema = z.object({
  ...commonFields,
  barDesignation: z.string().min(1),
  diameterMm: z.coerce.number().int().positive(),
  numberOfBars: z.coerce.number().int().nonnegative(),
  lengthM: z.coerce.number().nonnegative(),
  numberOfFaces: z.coerce.number().int().min(1),
  shape: z.string().optional(),
});

export async function createRebarEntry(formData: FormData) {
  const user = await requireUser();
  const parsed = rebarSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    date: formData.get("date"),
    barDesignation: formData.get("barDesignation"),
    diameterMm: formData.get("diameterMm"),
    numberOfBars: formData.get("numberOfBars"),
    lengthM: formData.get("lengthM"),
    numberOfFaces: formData.get("numberOfFaces"),
    shape: formData.get("shape") || undefined,
    remark: formData.get("remark") || undefined,
  });
  await requireContractorEntryRole(user, parsed.projectId);

  // Validate the diameter exists in the WeightFactor reference table.
  const weight = await db.weightFactor.findUnique({
    where: { diameterMm: parsed.diameterMm },
  });
  if (!weight) throw new Error(`No weight factor for bar Ø${parsed.diameterMm}mm.`);

  const entry = await db.rebarDailyEntry.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      date: parsed.date,
      barDesignation: parsed.barDesignation,
      diameterMm: parsed.diameterMm,
      numberOfBars: parsed.numberOfBars,
      lengthM: parsed.lengthM,
      numberOfFaces: parsed.numberOfFaces,
      shape: parsed.shape,
      remark: parsed.remark,
      createdById: user.id,
      status: "DRAFT",
    },
  });
  await audit({ userId: user.id, entityType: "RebarDailyEntry", entityId: entry.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/daily`);
}

// ------------------------------------------------------------
// Sign-off chain — Foreman → Superintendent → Deputy PM → Senior PM
// ------------------------------------------------------------

export async function signOffDailyEntry(formData: FormData) {
  const user = await requireUser();
  if (!canSignOffDailyReport(user.role as never)) {
    throw new Error("You are not authorized to sign off daily reports.");
  }
  const entityType = String(formData.get("entityType"));
  const entityId = String(formData.get("entityId"));
  const projectId = String(formData.get("projectId"));
  const comment = (formData.get("comment") as string | null) ?? undefined;

  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may sign off daily reports.");
  }

  const signOffRole = ROLE_TO_SIGNOFF[user.role];
  if (!signOffRole) throw new Error("Your role cannot sign off this document.");

  // Idempotent: one SignOff row per user per document.
  const existing = await db.signOff.findFirst({
    where: { entityType, entityId, userId: user.id },
  });
  if (existing) {
    await db.signOff.update({
      where: { id: existing.id },
      data: { signedAt: new Date(), comment },
    });
  } else {
    await db.signOff.create({
      data: {
        entityType,
        entityId,
        userId: user.id,
        signOffRole,
        signedAt: new Date(),
        comment,
      },
    });
  }

  // Advance status when the full chain has signed.
  await advanceDailyStatus(entityType, entityId);

  await audit({ userId: user.id, entityType, entityId, action: "APPROVE", diff: { signOffRole } });
  revalidatePath(`/projects/${projectId}/daily`);
}

async function advanceDailyStatus(entityType: string, entityId: string) {
  const signedRoles = await db.signOff.findMany({ where: { entityType, entityId } });
  const chainRequired = DAILY_SIGN_OFF_CHAIN.map((r) => ROLE_TO_SIGNOFF[r]);
  const have = new Set(signedRoles.map((s) => s.signOffRole));
  const complete = chainRequired.every((r) => have.has(r));
  const status = complete ? "APPROVED" : "SUBMITTED";

  if (entityType === "EARTHWORK_DAILY") {
    await db.earthworkDailyEntry.update({ where: { id: entityId }, data: { status } });
  } else if (entityType === "STRUCTURE_DAILY") {
    await db.structureDailyEntry.update({ where: { id: entityId }, data: { status } });
  } else if (entityType === "REBAR_DAILY") {
    await db.rebarDailyEntry.update({ where: { id: entityId }, data: { status } });
  }
}
