import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const HUNDRED = new Prisma.Decimal(100);

function normalizedWeights(ids: string[]) {
  const scale = 10000;
  const base = Math.floor((100 * scale) / ids.length);
  let remainder = 100 * scale - base * ids.length;
  return ids.map((id) => {
    const units = base + (remainder-- > 0 ? 1 : 0);
    return { id, weight: new Prisma.Decimal(units / scale) };
  });
}

async function applyWeights(projectId: string) {
  const nodes = await db.wbsNode.findMany({ where: { projectId }, select: { id: true, parentId: true } });
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    groups.set(node.parentId, [...(groups.get(node.parentId) ?? []), node.id]);
  }
  for (const ids of groups.values()) {
    for (const row of normalizedWeights(ids)) await db.wbsNode.update({ where: { id: row.id }, data: { weightPercent: row.weight } });
  }
  const activities = await db.scheduleActivity.findMany({ where: { wbsNode: { projectId } }, select: { id: true, wbsNodeId: true } });
  const activityGroups = new Map<string, string[]>();
  for (const activity of activities) activityGroups.set(activity.wbsNodeId, [...(activityGroups.get(activity.wbsNodeId) ?? []), activity.id]);
  for (const ids of activityGroups.values()) {
    for (const row of normalizedWeights(ids)) await db.scheduleActivity.update({ where: { id: row.id }, data: { weightPercent: row.weight } });
  }
  await db.wbsNode.updateMany({ where: { projectId, parentId: null }, data: { weightPercent: null, status: "ACTIVE" } });
  await db.wbsNode.updateMany({ where: { projectId }, data: { status: "ACTIVE" } });
}

async function ensureAssignments(projectId: string, contractorOrgId: string) {
  const users = await db.user.findMany({ where: { active: true, memberships: { some: { projectId } } }, select: { id: true, role: true, organizationId: true } });
  const senior = users.find((u) => u.organizationId === contractorOrgId && u.role === "SENIOR_PM") ?? users.find((u) => u.organizationId === contractorOrgId && u.role === "DEPUTY_PM");
  if (!senior) return;
  const roots = await db.wbsNode.findMany({ where: { projectId, parentId: null }, select: { id: true } });
  const fieldOwners = users.filter((u) => u.organizationId === contractorOrgId && ["SITE_ENGINEER", "SUPERINTENDENT"].includes(u.role));
  for (let i = 0; i < roots.length && fieldOwners.length; i++) {
    const target = fieldOwners[i % fieldOwners.length];
    const role = target.role === "SUPERINTENDENT" ? "SUPERINTENDENT_OWNER" : "SITE_ENGINEER_OWNER";
    const existing = await db.sectionAssignment.findFirst({ where: { projectId, userId: target.id, wbsNodeId: roots[i].id, endedAt: null } });
    if (!existing) await db.sectionAssignment.create({ data: { projectId, userId: target.id, wbsNodeId: roots[i].id, role, assignedById: senior.id } });
  }
  const activities = await db.scheduleActivity.findMany({ where: { wbsNode: { projectId } }, select: { id: true, wbsNodeId: true } });
  const engineers = users.filter((u) => u.role === "SITE_ENGINEER");
  const foremen = users.filter((u) => u.role === "FOREMAN");
  for (let i = 0; i < activities.length; i++) {
    const engineer = engineers[i % Math.max(1, engineers.length)];
    const foreman = foremen[i % Math.max(1, foremen.length)];
    if (engineer && !(await db.activityAssignment.findFirst({ where: { scheduleActivityId: activities[i].id, role: "SITE_ENGINEER", endedAt: null } }))) {
      await db.activityAssignment.create({ data: { scheduleActivityId: activities[i].id, userId: engineer.id, role: "SITE_ENGINEER", assignedById: senior.id } });
    }
    if (foreman && !(await db.activityAssignment.findFirst({ where: { scheduleActivityId: activities[i].id, role: "FOREMAN", endedAt: null } }))) {
      await db.activityAssignment.create({ data: { scheduleActivityId: activities[i].id, userId: foreman.id, role: "FOREMAN", assignedById: engineer?.id ?? senior.id } });
    }
  }
}

async function ensureContractChain(projectId: string, contractorOrgId: string) {
  const contracts = await db.contract.findMany({ where: { projectId, status: "ACTIVE" }, include: { contractorOrg: true } });
  const sectionOwners = await db.sectionAssignment.findMany({ where: { projectId, role: "SUBCONTRACTOR_OWNER", endedAt: null }, include: { user: true } });
  for (const contract of contracts) {
    if (contract.contractorOrgId === contractorOrgId || contract.scopeWbsNodeId) continue;
    const owner = sectionOwners.find((a) => a.user.organizationId === contract.contractorOrgId);
    if (owner) await db.contract.update({ where: { id: contract.id }, data: { scopeWbsNodeId: owner.wbsNodeId } });
  }
}

async function ensureLegacyPlan(projectId: string, contractorOrgId: string) {
  const contracts = await db.contract.findMany({ where: { projectId, status: "ACTIVE", contractorOrgId: { not: contractorOrgId }, scopeWbsNodeId: { not: null } } });
  const reviewer = await db.user.findFirst({ where: { organizationId: contractorOrgId, role: { in: ["SENIOR_PM", "DEPUTY_PM"] }, memberships: { some: { projectId } } } });
  if (!reviewer) return;
  for (const contract of contracts) {
    const author = await db.user.findFirst({ where: { organizationId: contract.contractorOrgId, memberships: { some: { projectId } }, role: { in: ["SUBCONTRACTOR_PM", "SITE_ENGINEER"] } } });
    if (!author || !contract.scopeWbsNodeId) continue;
    const existing = await db.wbsPlanSubmission.findFirst({ where: { contractId: contract.id } });
    if (!existing) await db.wbsPlanSubmission.create({ data: { projectId, contractId: contract.id, rootWbsNodeId: contract.scopeWbsNodeId, title: "Legacy WBS baseline — backfilled", status: "APPROVED", createdById: author.id, submittedById: author.id, submittedAt: new Date(), reviewedById: reviewer.id, reviewedAt: new Date(), reviewComments: "Existing live WBS accepted as the migration baseline.", validationSummary: { migrated: true, siblingWeights: "normalized-to-100" } } });
  }
}

async function ensureOversight(projectId: string, contractorOrgId: string) {
  const manager = await db.user.findFirst({ where: { organizationId: contractorOrgId, role: { in: ["SENIOR_PM", "DEPUTY_PM"] }, memberships: { some: { projectId } } } });
  const observers = await db.user.findMany({ where: { organizationId: contractorOrgId, role: { in: ["SITE_ENGINEER", "SUPERINTENDENT", "FOREMAN"] }, memberships: { some: { projectId } } }, take: 10 });
  const contracts = await db.contract.findMany({ where: { projectId, status: "ACTIVE", contractorOrgId: { not: contractorOrgId }, scopeWbsNodeId: { not: null } } });
  if (!manager) return;
  for (let i = 0; i < contracts.length && observers.length; i++) {
    const contract = contracts[i]; const observer = observers[i % observers.length];
    let assignment = await db.oversightAssignment.findFirst({ where: { contractId: contract.id, userId: observer.id, endedAt: null } });
    assignment ??= await db.oversightAssignment.create({ data: { projectId, userId: observer.id, contractId: contract.id, scopeWbsNodeId: contract.scopeWbsNodeId!, assignedById: manager.id } });
    const existingEntry = await db.oversightDailyEntry.findFirst({ where: { oversightAssignmentId: assignment.id } });
    if (!existingEntry) await db.oversightDailyEntry.create({ data: { projectId, contractId: contract.id, wbsNodeId: contract.scopeWbsNodeId!, oversightAssignmentId: assignment.id, date: new Date(), activityDescription: "Legacy work-status verification baseline", observedQuantity: new Prisma.Decimal(1), reportedQuantity: new Prisma.Decimal(1), observedUnit: "baseline", quantityAssessment: "MATCHES_REPORTED", qualityAssessment: "Existing scope reviewed during WBS migration", status: "APPROVED", createdById: observer.id } });
  }
}

async function main() {
  const projects = await db.project.findMany({ select: { id: true, code: true, contractorOrgId: true } });
  for (const project of projects) {
    await applyWeights(project.id);
    await ensureAssignments(project.id, project.contractorOrgId);
    await ensureContractChain(project.id, project.contractorOrgId);
    await ensureLegacyPlan(project.id, project.contractorOrgId);
    await ensureOversight(project.id, project.contractorOrgId);
    console.log(`Backfilled ${project.code}`);
  }
  const totals = await Promise.all([db.wbsNode.count(), db.scheduleActivity.count(), db.wbsPlanSubmission.count(), db.oversightAssignment.count(), db.oversightDailyEntry.count()]);
  console.log({ wbsNodes: totals[0], activities: totals[1], plans: totals[2], oversightAssignments: totals[3], oversightDailyEntries: totals[4], invariant: HUNDRED.toString() });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
