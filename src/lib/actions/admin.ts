"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma/enums";

function assertAdmin(user: { role: UserRole }) {
  if (user.role !== "ADMIN") throw new Error("Only system admins may perform this action.");
}

const createOrgSchema = z.object({
  name: z.string().min(2),
  nameAmharic: z.string().optional(),
  partyType: z.enum(["CONTRACTOR", "CLIENT", "CONSULTANT", "SUBCONTRACTOR", "SUPPLIER", "REGULATOR"]),
  contractorGrade: z
    .enum(["GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GRADE_6", "GRADE_7", "GRADE_8", "GRADE_9", "GRADE_10"])
    .optional(),
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
});

export async function createOrganization(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user);
  const parsed = createOrgSchema.parse({
    name: formData.get("name"),
    nameAmharic: formData.get("nameAmharic") || undefined,
    partyType: formData.get("partyType"),
    contractorGrade: formData.get("contractorGrade") || undefined,
    licenseNumber: formData.get("licenseNumber") || undefined,
    taxId: formData.get("taxId") || undefined,
  });
  const org = await db.organization.create({ data: parsed });
  await audit({ userId: user.id, entityType: "Organization", entityId: org.id, action: "CREATE", diff: parsed });
  revalidatePath("/admin");
}

const createUserSchema = z.object({
  organizationId: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  jobTitle: z.string().min(1),
  role: z.enum([
    "FOREMAN", "SUPERINTENDENT", "SITE_ENGINEER", "DEPUTY_PM", "SENIOR_PM",
    "QC_INSPECTOR", "HSE_OFFICER", "QS", "PROCUREMENT", "FINANCE", "HR",
    "EQUIPMENT_MANAGER", "CONTRACTS_LEGAL", "CONSULTANT_ENGINEER", "CLIENT_REP", "ADMIN",
  ]),
  phone: z.string().optional(),
});

export async function createUser(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user);
  const parsed = createUserSchema.parse({
    organizationId: formData.get("organizationId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    jobTitle: formData.get("jobTitle"),
    role: formData.get("role"),
    phone: formData.get("phone") || undefined,
  });
  const created = await db.user.create({
    data: {
      ...parsed,
      passwordHash: await bcrypt.hash(parsed.password, 10),
    },
  });
  await audit({ userId: user.id, entityType: "User", entityId: created.id, action: "CREATE", diff: { email: created.email, role: created.role } });
  revalidatePath("/admin");
}

const createProjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  projectType: z.enum(["ROAD", "BUILDING", "HOUSING", "ENERGY", "GREEN_PARK", "OTHER"]),
  contractorOrgId: z.string().min(1),
  clientOrgId: z.string().min(1),
  consultantOrgId: z.string().optional(),
  contractValue: z.coerce.number().positive(),
  // Was "LOCAL_STANDARD" — the actual Prisma enum value is ETHIO_STANDARD
  // (schema.prisma `enum ContractType`). The mismatch meant every attempt
  // to create a local-standard-contract project threw at the Prisma layer.
  contractType: z.enum(["FIDIC_RED", "FIDIC_YELLOW", "ETHIO_STANDARD", "OTHER"]),
  plannedStartDate: z.coerce.date(),
  plannedEndDate: z.coerce.date(),
});

export async function createProject(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user);
  const parsed = createProjectSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    projectType: formData.get("projectType"),
    contractorOrgId: formData.get("contractorOrgId"),
    clientOrgId: formData.get("clientOrgId"),
    consultantOrgId: formData.get("consultantOrgId") || undefined,
    contractValue: formData.get("contractValue"),
    contractType: formData.get("contractType"),
    plannedStartDate: formData.get("plannedStartDate"),
    plannedEndDate: formData.get("plannedEndDate"),
  });
  const project = await db.project.create({
    data: {
      name: parsed.name,
      code: parsed.code,
      projectType: parsed.projectType,
      contractorOrgId: parsed.contractorOrgId,
      clientOrgId: parsed.clientOrgId,
      consultantOrgId: parsed.consultantOrgId,
      contractValue: parsed.contractValue,
      contractType: parsed.contractType,
      plannedStartDate: parsed.plannedStartDate,
      plannedEndDate: parsed.plannedEndDate,
      status: "PLANNING",
    },
  });
  await audit({ userId: user.id, entityType: "Project", entityId: project.id, action: "CREATE", diff: { name: project.name } });
  redirect(`/projects/${project.id}/overview`);
}

const createMembershipSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  projectRole: z.string().min(1),
});

export async function createMembership(formData: FormData) {
  const user = await requireUser();
  assertAdmin(user);
  const parsed = createMembershipSchema.parse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
    organizationId: formData.get("organizationId"),
    projectRole: formData.get("projectRole"),
  });
  const membership = await db.projectMembership.create({ data: parsed });
  await audit({ userId: user.id, entityType: "ProjectMembership", entityId: membership.id, action: "CREATE", diff: parsed });
  revalidatePath("/admin");
  revalidatePath(`/projects/${parsed.projectId}/overview`);
}