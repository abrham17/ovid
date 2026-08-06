"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  getProjectParty,
  canManageMaterials,
  canManageEquipment,
  canRecordLabor,
  canRecordCustody,
} from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { assertWbsNodeVisibleToUser } from "@/lib/actions/project-guards";

async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || !["CONTRACTOR", "SUBCONTRACTOR"].includes(party.partyType)) {
    throw new Error("Only contractor or subcontractor users may modify resources.");
  }
  return party;
}

/**
 * Equipment/Employee records are owned by an Organization, but the form
 * only takes an `organizationId` string with no check that it's actually
 * the caller's own org. Without this, any CONTRACTOR-side user could pass
 * an arbitrary organizationId and create equipment/staff records that
 * appear to belong to a different company entirely (e.g. a competitor's
 * org id, if guessed/leaked) — file 09's multi-tenant isolation guarantee
 * ("other contractors' projects/orgs are invisible") should hold here too.
 */
function assertOwnOrganization(user: SessionUser, organizationId: string) {
  if (user.role !== "ADMIN" && organizationId !== user.organizationId) {
    throw new Error("You may only manage resources under your own organization.");
  }
}

async function assertEmployeeBelongsToCaller(user: SessionUser, employeeId: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { organizationId: true },
  });
  if (!employee) throw new Error("Selected employee does not exist.");
  assertOwnOrganization(user, employee.organizationId);
}

async function assertEquipmentBelongsToCaller(user: SessionUser, equipmentId: string) {
  const equipment = await db.equipment.findUnique({
    where: { id: equipmentId },
    select: { organizationId: true },
  });
  if (!equipment) throw new Error("Selected equipment does not exist.");
  assertOwnOrganization(user, equipment.organizationId);
}

// ---------------------------------------------------------------
// Materials
// ---------------------------------------------------------------

const materialSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  unit: z.string().min(1),
  importDependent: z.coerce.boolean().optional(),
});

export async function createMaterialItem(formData: FormData) {
  const user = await requireUser();
  const parsed = materialSchema.parse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    importDependent: formData.get("importDependent") === "on",
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageMaterials(user.role)) {
    throw new Error("Your role is not authorized to manage materials.");
  }

  const item = await db.materialItem.create({
    data: { name: parsed.name, unit: parsed.unit, importDependent: parsed.importDependent },
  });
  await audit({ userId: user.id, entityType: "MaterialItem", entityId: item.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

const demandSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  materialItemId: z.string().min(1),
  neededByDate: z.coerce.date(),
  quantityNeeded: z.coerce.number().positive(),
});

export async function createMaterialDemand(formData: FormData) {
  const user = await requireUser();
  const parsed = demandSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    materialItemId: formData.get("materialItemId"),
    neededByDate: formData.get("neededByDate"),
    quantityNeeded: formData.get("quantityNeeded"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageMaterials(user.role)) {
    throw new Error("Your role is not authorized to manage materials.");
  }
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);

  const demand = await db.materialDemand.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      materialItemId: parsed.materialItemId,
      neededByDate: parsed.neededByDate,
      quantityNeeded: parsed.quantityNeeded,
    },
  });
  await audit({ userId: user.id, entityType: "MaterialDemand", entityId: demand.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

const deliverySchema = z.object({
  projectId: z.string().min(1),
  demandId: z.string().min(1),
  quantityDelivered: z.coerce.number().nonnegative(),
});

export async function updateDemandDelivery(formData: FormData) {
  const user = await requireUser();
  const parsed = deliverySchema.parse({
    projectId: formData.get("projectId"),
    demandId: formData.get("demandId"),
    quantityDelivered: formData.get("quantityDelivered"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageMaterials(user.role)) {
    throw new Error("Your role is not authorized to manage materials.");
  }

  await db.materialDemand.update({
    where: { id: parsed.demandId },
    data: { quantityDelivered: parsed.quantityDelivered },
  });
  await audit({ userId: user.id, entityType: "MaterialDemand", entityId: parsed.demandId, action: "UPDATE", diff: { quantityDelivered: parsed.quantityDelivered } });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

// ---------------------------------------------------------------
// Equipment & utilization (OH / (OH + IH + DH))
// ---------------------------------------------------------------

const equipmentSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  equipmentType: z.string().min(2),
  plateNo: z.string().optional(),
  serialNo: z.string().optional(),
});

export async function createEquipment(formData: FormData) {
  const user = await requireUser();
  const parsed = equipmentSchema.parse({
    projectId: formData.get("projectId"),
    organizationId: formData.get("organizationId"),
    equipmentType: formData.get("equipmentType"),
    plateNo: formData.get("plateNo") || undefined,
    serialNo: formData.get("serialNo") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageEquipment(user.role)) {
    throw new Error("Your role is not authorized to manage equipment.");
  }
  assertOwnOrganization(user, parsed.organizationId);

  const eq = await db.equipment.create({
    data: {
      organizationId: parsed.organizationId,
      equipmentType: parsed.equipmentType,
      plateNo: parsed.plateNo,
      serialNo: parsed.serialNo,
    },
  });
  await audit({ userId: user.id, entityType: "Equipment", entityId: eq.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

const usageSchema = z.object({
  projectId: z.string().min(1),
  equipmentId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  date: z.coerce.date(),
  operatingHours: z.coerce.number().nonnegative(),
  idleHours: z.coerce.number().nonnegative(),
  downHours: z.coerce.number().nonnegative(),
});

export async function logEquipmentUsage(formData: FormData) {
  const user = await requireUser();
  const parsed = usageSchema.parse({
    projectId: formData.get("projectId"),
    equipmentId: formData.get("equipmentId"),
    wbsNodeId: formData.get("wbsNodeId"),
    date: formData.get("date"),
    operatingHours: formData.get("operatingHours") || 0,
    idleHours: formData.get("idleHours") || 0,
    downHours: formData.get("downHours") || 0,
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageEquipment(user.role)) {
    throw new Error("Your role is not authorized to log equipment usage.");
  }
  await assertEquipmentBelongsToCaller(user, parsed.equipmentId);
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);

  const log = await db.equipmentUsageLog.create({
    data: {
      equipmentId: parsed.equipmentId,
      wbsNodeId: parsed.wbsNodeId,
      projectId: parsed.projectId,
      date: parsed.date,
      operatingHours: parsed.operatingHours,
      idleHours: parsed.idleHours,
      downHours: parsed.downHours,
    },
  });
  await audit({ userId: user.id, entityType: "EquipmentUsageLog", entityId: log.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

// ---------------------------------------------------------------
// Labor — employees, attendance, assignment
// ---------------------------------------------------------------

const employeeSchema = z.object({
  projectId: z.string().min(1),
  organizationId: z.string().min(1),
  fullName: z.string().min(2),
  profession: z.string().min(2),
  employmentType: z.enum(["PERMANENT", "DAILY_CASUAL", "SUBCONTRACTOR_STAFF"]),
});

export async function createEmployee(formData: FormData) {
  const user = await requireUser();
  const parsed = employeeSchema.parse({
    projectId: formData.get("projectId"),
    organizationId: formData.get("organizationId"),
    fullName: formData.get("fullName"),
    profession: formData.get("profession"),
    employmentType: formData.get("employmentType"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordLabor(user.role)) {
    throw new Error("Your role is not authorized to manage labor.");
  }
  assertOwnOrganization(user, parsed.organizationId);

  const emp = await db.employee.create({
    data: {
      organizationId: parsed.organizationId,
      fullName: parsed.fullName,
      profession: parsed.profession,
      employmentType: parsed.employmentType,
    },
  });
  await audit({ userId: user.id, entityType: "Employee", entityId: emp.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

const attendanceSchema = z.object({
  projectId: z.string().min(1),
  employeeId: z.string().min(1),
  date: z.coerce.date(),
  present: z.coerce.boolean(),
  hours: z.coerce.number().min(0).max(24),
});

export async function recordAttendance(formData: FormData) {
  const user = await requireUser();
  const parsed = attendanceSchema.parse({
    projectId: formData.get("projectId"),
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    present: formData.get("present") === "on",
    hours: formData.get("hours") || 8,
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordLabor(user.role)) {
    throw new Error("Your role is not authorized to manage labor.");
  }
  await assertEmployeeBelongsToCaller(user, parsed.employeeId);

  const existing = await db.laborAttendance.findUnique({
    where: { employeeId_date: { employeeId: parsed.employeeId, date: parsed.date } },
  });
  if (existing) {
    await db.laborAttendance.update({
      where: { id: existing.id },
      data: { present: parsed.present, hours: parsed.hours },
    });
  } else {
    await db.laborAttendance.create({
      data: { employeeId: parsed.employeeId, date: parsed.date, present: parsed.present, hours: parsed.hours },
    });
  }
  await audit({ userId: user.id, entityType: "LaborAttendance", entityId: parsed.employeeId, action: "UPDATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

const assignmentSchema = z.object({
  projectId: z.string().min(1),
  employeeId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  date: z.coerce.date(),
  hoursOnTask: z.coerce.number().min(0).max(24),
});

export async function recordLaborAssignment(formData: FormData) {
  const user = await requireUser();
  const parsed = assignmentSchema.parse({
    projectId: formData.get("projectId"),
    employeeId: formData.get("employeeId"),
    wbsNodeId: formData.get("wbsNodeId"),
    date: formData.get("date"),
    hoursOnTask: formData.get("hoursOnTask") || 8,
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordLabor(user.role)) {
    throw new Error("Your role is not authorized to manage labor.");
  }
  await assertEmployeeBelongsToCaller(user, parsed.employeeId);
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);

  const assignment = await db.laborAssignment.create({
    data: {
      employeeId: parsed.employeeId,
      wbsNodeId: parsed.wbsNodeId,
      date: parsed.date,
      hoursOnTask: parsed.hoursOnTask,
    },
  });
  await audit({ userId: user.id, entityType: "LaborAssignment", entityId: assignment.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

// ---------------------------------------------------------------
// Chain of custody (anti-theft)
// ---------------------------------------------------------------

const custodySchema = z.object({
  projectId: z.string().min(1),
  materialItemId: z.string().optional(),
  equipmentId: z.string().optional(),
  fromLocation: z.string().min(2),
  toLocation: z.string().min(2),
  transferredAt: z.coerce.date(),
  quantity: z.coerce.number().nonnegative().optional(),
});

export async function recordCustodyTransfer(formData: FormData) {
  const user = await requireUser();
  const parsed = custodySchema.parse({
    projectId: formData.get("projectId"),
    materialItemId: formData.get("materialItemId") || undefined,
    equipmentId: formData.get("equipmentId") || undefined,
    fromLocation: formData.get("fromLocation"),
    toLocation: formData.get("toLocation"),
    transferredAt: formData.get("transferredAt"),
    quantity: formData.get("quantity") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordCustody(user.role)) {
    throw new Error("Your role is not authorized to record custody transfers.");
  }
  if (!parsed.materialItemId && !parsed.equipmentId) {
    throw new Error("A custody transfer must reference a material or equipment.");
  }
  if (parsed.equipmentId) {
    await assertEquipmentBelongsToCaller(user, parsed.equipmentId);
  }

  const log = await db.custodyLog.create({
    data: {
      materialItemId: parsed.materialItemId,
      equipmentId: parsed.equipmentId,
      fromLocation: parsed.fromLocation,
      toLocation: parsed.toLocation,
      transferredByUserId: user.id,
      transferredAt: parsed.transferredAt,
      quantity: parsed.quantity,
    },
  });
  await audit({ userId: user.id, entityType: "CustodyLog", entityId: log.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/resources`);
}

export async function acknowledgeCustody(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId"));
  const custodyId = String(formData.get("custodyId"));
  await requireContractor(user, projectId);
  if (!canRecordCustody(user.role)) {
    throw new Error("Your role is not authorized to manage custody logs.");
  }
  const log = await db.custodyLog.findUnique({
    where: { id: custodyId },
    select: { equipmentId: true },
  });
  if (!log) throw new Error("Custody log not found.");
  if (log.equipmentId) {
    await assertEquipmentBelongsToCaller(user, log.equipmentId);
  }

  await db.custodyLog.update({
    where: { id: custodyId },
    data: { receivedByUserId: user.id },
  });
  await audit({ userId: user.id, entityType: "CustodyLog", entityId: custodyId, action: "UPDATE", diff: { receivedByUserId: user.id } });
  revalidatePath(`/projects/${projectId}/resources`);
}
