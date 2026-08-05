"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty, canEditEngineering, canRecordElementProgress } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { StructuralElementType } from "@/generated/prisma/enums";

async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may modify engineering takeoff.");
  }
  return party;
}

// ---------------------------------------------------------------
// Structural elements
// ---------------------------------------------------------------

const elementSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  elementType: z.enum(["SHEAR_WALL", "BEAM", "SLAB", "STAIRCASE", "COLUMN", "FOOTING", "NON_SHEAR_WALL"]),
  axisFrom: z.string().optional(),
  axisTo: z.string().optional(),
  floor: z.string().optional(),
});

export async function createStructuralElement(formData: FormData) {
  const user = await requireUser();
  const parsed = elementSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    elementType: formData.get("elementType"),
    axisFrom: formData.get("axisFrom") || undefined,
    axisTo: formData.get("axisTo") || undefined,
    floor: formData.get("floor") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canEditEngineering(user.role)) {
    throw new Error("Your role is not authorized to edit engineering takeoff.");
  }

  const el = await db.structuralElement.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      elementType: parsed.elementType as StructuralElementType,
      axisFrom: parsed.axisFrom,
      axisTo: parsed.axisTo,
      floor: parsed.floor,
    },
  });
  await audit({ userId: user.id, entityType: "StructuralElement", entityId: el.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/engineering`);
}

/**
 * Clone a template element (with all its rebar/formwork lines) onto a repeated
 * unit — the "automate the arithmetic" pattern for mass housing.
 */
const cloneSchema = z.object({
  projectId: z.string().min(1),
  templateElementId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  axisFrom: z.string().optional(),
  axisTo: z.string().optional(),
  floor: z.string().optional(),
});

export async function cloneElement(formData: FormData) {
  const user = await requireUser();
  const parsed = cloneSchema.parse({
    projectId: formData.get("projectId"),
    templateElementId: formData.get("templateElementId"),
    wbsNodeId: formData.get("wbsNodeId"),
    axisFrom: formData.get("axisFrom") || undefined,
    axisTo: formData.get("axisTo") || undefined,
    floor: formData.get("floor") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canEditEngineering(user.role)) {
    throw new Error("Your role is not authorized to edit engineering takeoff.");
  }

  const template = await db.structuralElement.findUnique({
    where: { id: parsed.templateElementId },
    include: { rebarLines: true, formworkLines: true },
  });
  if (!template) throw new Error("Template element not found.");

  const clone = await db.structuralElement.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      elementType: template.elementType,
      axisFrom: parsed.axisFrom,
      axisTo: parsed.axisTo,
      floor: parsed.floor,
      templateElementId: template.id,
      rebarLines: {
        create: template.rebarLines.map((r) => ({
          barDesignation: r.barDesignation,
          diameterMm: r.diameterMm,
          spacingM: r.spacingM,
          numberOfFaces: r.numberOfFaces,
          numberOfBars: r.numberOfBars,
          spanM: r.spanM,
        })),
      },
      formworkLines: {
        create: template.formworkLines.map((f) => ({
          segmentLabel: f.segmentLabel,
          lengthM: f.lengthM,
          heightM: f.heightM,
        })),
      },
    },
  });
  await audit({ userId: user.id, entityType: "StructuralElement", entityId: clone.id, action: "CREATE", diff: { ...parsed, cloneOf: template.id } });
  revalidatePath(`/projects/${parsed.projectId}/engineering`);
}

// ---------------------------------------------------------------
// Rebar lines (auto-weight via WeightFactor) & formwork lines
// ---------------------------------------------------------------

const rebarSchema = z.object({
  projectId: z.string().min(1),
  structuralElementId: z.string().min(1),
  barDesignation: z.string().min(1),
  diameterMm: z.coerce.number().int().positive(),
  spacingM: z.coerce.number().positive().optional(),
  numberOfFaces: z.coerce.number().int().min(1).default(1),
  numberOfBars: z.coerce.number().int().positive(),
  spanM: z.coerce.number().positive(),
});

export async function addRebarLine(formData: FormData) {
  const user = await requireUser();
  const parsed = rebarSchema.parse({
    projectId: formData.get("projectId"),
    structuralElementId: formData.get("structuralElementId"),
    barDesignation: formData.get("barDesignation"),
    diameterMm: formData.get("diameterMm"),
    spacingM: formData.get("spacingM") || undefined,
    numberOfFaces: formData.get("numberOfFaces") || 1,
    numberOfBars: formData.get("numberOfBars"),
    spanM: formData.get("spanM"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canEditEngineering(user.role)) {
    throw new Error("Your role is not authorized to edit engineering takeoff.");
  }

  const wf = await db.weightFactor.findUnique({ where: { diameterMm: parsed.diameterMm } });
  if (!wf) throw new Error(`No weight factor for Ø${parsed.diameterMm} mm.`);

  const line = await db.rebarLine.create({
    data: {
      structuralElementId: parsed.structuralElementId,
      barDesignation: parsed.barDesignation,
      diameterMm: parsed.diameterMm,
      spacingM: parsed.spacingM,
      numberOfFaces: parsed.numberOfFaces,
      numberOfBars: parsed.numberOfBars,
      spanM: parsed.spanM,
    },
  });
  // auto-weight = Ø16 → 1.58 kg/m × span × bars × faces
  await audit({
    userId: user.id,
    entityType: "RebarLine",
    entityId: line.id,
    action: "CREATE",
    diff: { ...parsed, weightKg: Number(wf.kgPerMeter) * parsed.spanM * parsed.numberOfBars * parsed.numberOfFaces },
  });
  revalidatePath(`/projects/${parsed.projectId}/engineering`);
}

const formworkSchema = z.object({
  projectId: z.string().min(1),
  structuralElementId: z.string().min(1),
  segmentLabel: z.string().optional(),
  lengthM: z.coerce.number().positive(),
  heightM: z.coerce.number().positive(),
});

export async function addFormworkLine(formData: FormData) {
  const user = await requireUser();
  const parsed = formworkSchema.parse({
    projectId: formData.get("projectId"),
    structuralElementId: formData.get("structuralElementId"),
    segmentLabel: formData.get("segmentLabel") || undefined,
    lengthM: formData.get("lengthM"),
    heightM: formData.get("heightM"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canEditEngineering(user.role)) {
    throw new Error("Your role is not authorized to edit engineering takeoff.");
  }

  const line = await db.formworkLine.create({
    data: {
      structuralElementId: parsed.structuralElementId,
      segmentLabel: parsed.segmentLabel,
      lengthM: parsed.lengthM,
      heightM: parsed.heightM,
    },
  });
  await audit({ userId: user.id, entityType: "FormworkLine", entityId: line.id, action: "CREATE", diff: { ...parsed, areaM2: parsed.lengthM * parsed.heightM } });
  revalidatePath(`/projects/${parsed.projectId}/engineering`);
}

// ---------------------------------------------------------------
// Element progress checkpoints (rebar/formwork/concrete, Q1–Q3)
// ---------------------------------------------------------------

const progressSchema = z.object({
  projectId: z.string().min(1),
  structuralElementId: z.string().min(1),
  discipline: z.enum(["REBAR", "FORMWORK", "CONCRETE"]),
  checkpoint: z.enum(["Q1", "Q2", "Q3"]),
});

export async function recordElementProgress(formData: FormData) {
  const user = await requireUser();
  const parsed = progressSchema.parse({
    projectId: formData.get("projectId"),
    structuralElementId: formData.get("structuralElementId"),
    discipline: formData.get("discipline"),
    checkpoint: formData.get("checkpoint"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordElementProgress(user.role)) {
    throw new Error("Your role is not authorized to record element progress.");
  }

  const existing = await db.elementProgress.findUnique({
    where: {
      structuralElementId_discipline_checkpoint: {
        structuralElementId: parsed.structuralElementId,
        discipline: parsed.discipline,
        checkpoint: parsed.checkpoint,
      },
    },
  });
  if (existing) {
    await db.elementProgress.update({
      where: { id: existing.id },
      data: { completedDate: existing.completedDate ? null : new Date() },
    });
  } else {
    await db.elementProgress.create({
      data: {
        structuralElementId: parsed.structuralElementId,
        discipline: parsed.discipline,
        checkpoint: parsed.checkpoint,
        completedDate: new Date(),
      },
    });
  }
  await audit({ userId: user.id, entityType: "ElementProgress", entityId: parsed.structuralElementId, action: "UPDATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/engineering`);
}
