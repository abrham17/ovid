import { db } from "@/lib/db";
import {
  canApprovePurchaseOrder,
  canCertifyMeasurement,
  canCloseDefect,
  canCloseRisk,
  canCloseSafetyIncident,
  canCreateRisk,
  canEditEngineering,
  canEnterDailyReport,
  canGenerateReport,
  canIssueDocument,
  canLogDefect,
  canLogSafetyObservation,
  canManageBids,
  canManageBoq,
  canManageMaterials,
  canManagePurchaseOrders,
  canManagePunchList,
  canPayIpc,
  canPrepareIpc,
  canPrepareVariation,
  canRecordCustody,
  canRecordElementProgress,
  canRecordItr,
  canRecordLabor,
  canRecordReceipt,
  canSignOffDailyReport,
  getProjectParty,
  type SessionUser,
} from "@/lib/rbac";
import { getOrganizationScope, type OrgScope } from "@/lib/rbac/organizationScope";
import type { WorkspaceTab } from "@/lib/rbac";

function n(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function wbsScopeWhere(projectId: string, scope: OrgScope) {
  return scope.visibleWbsNodeIds === "ALL"
    ? { projectId }
    : { projectId, id: { in: scope.visibleWbsNodeIds } };
}

function scopedWbsIds(scope: OrgScope) {
  return scope.visibleWbsNodeIds === "ALL" ? undefined : { in: scope.visibleWbsNodeIds };
}

async function getBase(user: SessionUser, projectId: string) {
  const [party, scope] = await Promise.all([
    getProjectParty(user, projectId),
    getOrganizationScope(user, projectId),
  ]);
  if (!party || !scope) return null;
  return { party, scope };
}

export async function getDailyWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const wbsNodeId = scopedWbsIds(base.scope);
  const [earthwork, structure, rebar] = await Promise.all([
    db.earthworkDailyEntry.findMany({
      where: { projectId, wbsNodeId },
      include: { wbsNode: { select: { code: true, name: true } }, createdBy: { select: { fullName: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    db.structureDailyEntry.findMany({
      where: { projectId, wbsNodeId },
      include: { wbsNode: { select: { code: true, name: true } }, createdBy: { select: { fullName: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    db.rebarDailyEntry.findMany({
      where: { projectId, wbsNodeId },
      include: { wbsNode: { select: { code: true, name: true } }, createdBy: { select: { fullName: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);
  const entries = [
    ...earthwork.map((e) => ({
      id: e.id,
      type: "Earthwork",
      date: iso(e.date),
      title: e.activityDescription,
      status: e.status,
      wbs: `${e.wbsNode.code} ${e.wbsNode.name}`,
      createdBy: e.createdBy.fullName,
      metric: [e.operatingHours ? `${n(e.operatingHours)} OH` : null, e.quantityLength ? `${n(e.quantityLength)} m` : null].filter(Boolean).join(" / "),
    })),
    ...structure.map((e) => ({
      id: e.id,
      type: "Structure",
      date: iso(e.date),
      title: e.activityDescription,
      status: e.status,
      wbs: `${e.wbsNode.code} ${e.wbsNode.name}`,
      createdBy: e.createdBy.fullName,
      metric: e.actualQuantity ? `${n(e.actualQuantity)} actual qty` : "",
    })),
    ...rebar.map((e) => ({
      id: e.id,
      type: "Rebar",
      date: iso(e.date),
      title: `${e.barDesignation} Ø${e.diameterMm}`,
      status: e.status,
      wbs: `${e.wbsNode.code} ${e.wbsNode.name}`,
      createdBy: e.createdBy.fullName,
      metric: e.computedWeightKg ? `${n(e.computedWeightKg).toFixed(2)} kg` : "",
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 18);

  return {
    scopeBanner: base.scope.visibleWbsNodeIds === "ALL" ? null : "Showing daily reports only within your contracted WBS scope.",
    permissions: {
      canCreate: ["CONTRACTOR", "SUBCONTRACTOR"].includes(base.party.partyType) && canEnterDailyReport(user.role),
      canSignOff: base.party.partyType === "CONTRACTOR" && canSignOffDailyReport(user.role),
    },
    stats: {
      total: earthwork.length + structure.length + rebar.length,
      pending: entries.filter((e) => e.status !== "APPROVED").length,
      rebarKg: rebar.reduce((sum, e) => sum + n(e.computedWeightKg), 0),
    },
    entries,
  };
}

export async function getCostWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const wbsNodeId = scopedWbsIds(base.scope);
  const [boqItems, measurements, variations, actuals] = await Promise.all([
    db.boqItem.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { wbsNode: { select: { code: true, name: true } } }, take: 20 }),
    db.measurementEntry.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { wbsNode: { select: { code: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 30 }),
    db.variationOrder.findMany({ where: { projectId, wbsNodeId }, include: { wbsNode: { select: { code: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    db.costActual.findMany({ where: { boqItem: { wbsNode: { projectId, id: wbsNodeId } } }, take: 200 }),
  ]);
  const canViewCostDetail = base.scope.canViewCostDetail;
  return {
    canViewCostDetail,
    permissions: {
      canManageBoq: base.party.partyType === "CONTRACTOR" && canManageBoq(user.role),
      canPrepareIpc: base.party.partyType === "CONTRACTOR" && canPrepareIpc(user.role),
      canCertify: canCertifyMeasurement(base.party.partyType, user.role),
      canPay: base.party.partyType === "CONTRACTOR" && canPayIpc(user.role),
      canPrepareVariation: base.party.partyType === "CONTRACTOR" && canPrepareVariation(user.role),
    },
    stats: {
      boqCount: boqItems.length,
      measurementCount: measurements.length,
      certifiedCount: measurements.filter((m) => ["CERTIFIED", "PAID"].includes(m.status)).length,
      variationCount: variations.length,
      budget: canViewCostDetail ? boqItems.reduce((sum, item) => sum + n(item.budgetedQuantity) * n(item.unitRate), 0) : null,
      actual: canViewCostDetail ? actuals.reduce((sum, item) => sum + n(item.amount), 0) : null,
    },
    boqItems: boqItems.map((item) => ({
      id: item.id,
      code: item.itemCode,
      description: item.description,
      unit: item.unit,
      quantity: n(item.budgetedQuantity),
      unitRate: canViewCostDetail ? n(item.unitRate) : null,
      wbs: `${item.wbsNode.code} ${item.wbsNode.name}`,
    })),
    measurements: measurements.map((m) => ({
      id: m.id,
      itemNo: m.itemNo,
      status: m.status,
      quantity: n(m.quantity),
      unitRate: canViewCostDetail ? n(m.unitRate) : null,
      certificateNo: m.certificateNo,
      wbs: `${m.wbsNode.code} ${m.wbsNode.name}`,
    })),
    variations: variations.map((v) => ({
      id: v.id,
      itemNo: v.itemNo,
      description: v.workDescription,
      status: v.status,
      costImpact: canViewCostDetail ? n(v.costImpact) : null,
      timeImpactDays: v.timeImpactDays,
      wbs: v.wbsNode ? `${v.wbsNode.code} ${v.wbsNode.name}` : "Project level",
    })),
  };
}

export async function getRiskWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const risks = await db.riskEntry.findMany({
    where: { projectId, wbsNodeId: scopedWbsIds(base.scope) },
    include: { owner: { select: { fullName: true } }, wbsNode: { select: { code: true, name: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
  });
  return {
    permissions: {
      canCreate: base.party.partyType === "CONTRACTOR" && canCreateRisk(user.role),
      canClose: base.party.partyType === "CONTRACTOR" && canCloseRisk(user.role),
    },
    stats: {
      open: risks.filter((r) => r.status === "OPEN").length,
      mitigating: risks.filter((r) => r.status === "MITIGATING").length,
      realized: risks.filter((r) => r.status === "REALIZED").length,
    },
    risks: risks.map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      status: r.status,
      score: r.likelihood * r.impact,
      owner: r.owner.fullName,
      wbs: r.wbsNode ? `${r.wbsNode.code} ${r.wbsNode.name}` : "Project level",
    })),
  };
}

export async function getSafetyWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const wbsNodeId = scopedWbsIds(base.scope);
  const [observations, incidents] = await Promise.all([
    db.safetyObservation.findMany({
      where: { wbsNode: { projectId, id: wbsNodeId } },
      include: { wbsNode: { select: { code: true, name: true } }, observedBy: { select: { fullName: true } } },
      orderBy: { observedAt: "desc" },
      take: 20,
    }),
    db.safetyIncident.findMany({
      where: { wbsNode: { projectId, id: wbsNodeId } },
      include: { wbsNode: { select: { code: true, name: true } }, affectsScheduleActivity: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    permissions: {
      canLog: ["CONTRACTOR", "SUBCONTRACTOR"].includes(base.party.partyType) && canLogSafetyObservation(user.role),
      canClose: ["CONTRACTOR", "SUBCONTRACTOR"].includes(base.party.partyType) && canCloseSafetyIncident(user.role),
    },
    stats: {
      observations: observations.length,
      openIncidents: incidents.filter((i) => i.status !== "CLOSED").length,
      critical: observations.filter((o) => o.severity === "CRITICAL").length,
    },
    observations: observations.map((o) => ({
      id: o.id,
      severity: o.severity,
      hazard: o.hazardDescription,
      action: o.immediateActionTaken,
      observedAt: iso(o.observedAt),
      observedBy: o.observedBy.fullName,
      wbs: `${o.wbsNode.code} ${o.wbsNode.name}`,
    })),
    incidents: incidents.map((i) => ({
      id: i.id,
      type: i.incidentType,
      status: i.status,
      description: i.description,
      correctiveAction: i.correctiveAction,
      activity: i.affectsScheduleActivity?.name ?? null,
      wbs: `${i.wbsNode.code} ${i.wbsNode.name}`,
    })),
  };
}

export async function getQualityWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const wbsNodeId = scopedWbsIds(base.scope);
  const [itrs, defects, punchItems] = await Promise.all([
    db.inspectionTestRecord.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { wbsNode: { select: { code: true, name: true } }, inspectedBy: { select: { fullName: true } } }, orderBy: { inspectedAt: "desc" }, take: 20 }),
    db.defectLog.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { wbsNode: { select: { code: true, name: true } }, responsibleOrg: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    db.punchListItem.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { wbsNode: { select: { code: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  const patterns = new Map<string, number>();
  punchItems.forEach((item) => {
    if (item.patternTag) patterns.set(item.patternTag, (patterns.get(item.patternTag) ?? 0) + 1);
  });
  return {
    permissions: {
      canRecordItr: base.party.partyType === "CONTRACTOR" && canRecordItr(user.role),
      canLogDefect: base.party.partyType === "CONTRACTOR" && canLogDefect(user.role),
      canCloseDefect: base.party.partyType === "CONTRACTOR" && canCloseDefect(user.role),
      canPunch: base.party.partyType === "CONTRACTOR" && canManagePunchList(user.role),
    },
    stats: {
      inspections: itrs.length,
      openDefects: defects.filter((d) => d.status !== "VERIFIED_CLOSED").length,
      openPunch: punchItems.filter((p) => p.status !== "VERIFIED").length,
    },
    itrs: itrs.map((i) => ({ id: i.id, type: i.inspectionType, result: i.result, inspectedAt: iso(i.inspectedAt), inspectedBy: i.inspectedBy.fullName, wbs: `${i.wbsNode.code} ${i.wbsNode.name}` })),
    defects: defects.map((d) => ({ id: d.id, description: d.description, status: d.status, delay: d.reworkDelayDays, responsible: d.responsibleOrg?.name ?? "Unassigned", wbs: `${d.wbsNode.code} ${d.wbsNode.name}` })),
    punchItems: punchItems.map((p) => ({ id: p.id, description: p.description, severity: p.severity, status: p.status, patternTag: p.patternTag, wbs: `${p.wbsNode.code} ${p.wbsNode.name}` })),
    patterns: [...patterns.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
  };
}

export async function getResourcesWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const wbsNodeId = scopedWbsIds(base.scope);
  const orgWhere = base.party.partyType === "SUBCONTRACTOR" ? { organizationId: user.organizationId } : {};
  const [demands, equipmentLogs, employees, assignments, custody] = await Promise.all([
    db.materialDemand.findMany({ where: { wbsNode: { projectId, id: wbsNodeId } }, include: { materialItem: true, wbsNode: { select: { code: true, name: true } } }, orderBy: { neededByDate: "asc" }, take: 20 }),
    db.equipmentUsageLog.findMany({ where: { projectId, wbsNodeId }, include: { equipment: true, wbsNode: { select: { code: true, name: true } } }, orderBy: { date: "desc" }, take: 20 }),
    db.employee.findMany({ where: orgWhere, include: { organization: { select: { name: true } } }, orderBy: { fullName: "asc" }, take: 30 }),
    db.laborAssignment.findMany({ where: { wbsNode: { projectId, id: wbsNodeId }, employee: orgWhere }, include: { employee: true, wbsNode: { select: { code: true, name: true } } }, orderBy: { date: "desc" }, take: 20 }),
    db.custodyLog.findMany({ where: { OR: [{ equipment: orgWhere }, { equipmentId: null }] }, include: { materialItem: true, equipment: true, transferredBy: { select: { fullName: true } }, receivedBy: { select: { fullName: true } } }, orderBy: { transferredAt: "desc" }, take: 20 }),
  ]);
  const utilizationHours = equipmentLogs.reduce((sum, log) => sum + n(log.operatingHours) + n(log.idleHours) + n(log.downHours), 0);
  const operatingHours = equipmentLogs.reduce((sum, log) => sum + n(log.operatingHours), 0);
  return {
    permissions: {
      canMaterials: canManageMaterials(user.role),
      canEquipment: canManageMaterials(user.role),
      canLabor: canRecordLabor(user.role),
      canCustody: canRecordCustody(user.role),
    },
    stats: {
      demandCount: demands.length,
      employees: employees.length,
      utilizationPct: utilizationHours ? Math.round((operatingHours / utilizationHours) * 100) : 0,
      openCustody: custody.filter((c) => !c.receivedByUserId).length,
    },
    demands: demands.map((d) => ({ id: d.id, material: d.materialItem.name, unit: d.materialItem.unit, needed: n(d.quantityNeeded), delivered: n(d.quantityDelivered), neededBy: iso(d.neededByDate), wbs: `${d.wbsNode.code} ${d.wbsNode.name}` })),
    equipmentLogs: equipmentLogs.map((l) => ({ id: l.id, equipment: l.equipment.plateNo ?? l.equipment.serialNo ?? l.equipment.equipmentType, date: iso(l.date), operating: n(l.operatingHours), idle: n(l.idleHours), down: n(l.downHours), wbs: `${l.wbsNode.code} ${l.wbsNode.name}` })),
    employees: employees.map((e) => ({ id: e.id, name: e.fullName, profession: e.profession, type: e.employmentType, organization: e.organization.name })),
    assignments: assignments.map((a) => ({ id: a.id, employee: a.employee.fullName, date: iso(a.date), hours: n(a.hoursOnTask), wbs: `${a.wbsNode.code} ${a.wbsNode.name}` })),
    custody: custody.map((c) => ({ id: c.id, item: c.materialItem?.name ?? c.equipment?.equipmentType ?? "Asset", from: c.fromLocation, to: c.toLocation, transferredBy: c.transferredBy.fullName, receivedBy: c.receivedBy?.fullName ?? null, transferredAt: iso(c.transferredAt) })),
  };
}

export async function getEngineeringWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const elements = await db.structuralElement.findMany({
    where: { wbsNode: wbsScopeWhere(projectId, base.scope) },
    include: { wbsNode: { select: { code: true, name: true } }, rebarLines: true, formworkLines: true, progress: true },
    orderBy: [{ floor: "asc" }, { createdAt: "desc" }],
    take: 40,
  });
  return {
    permissions: {
      canEdit: base.party.partyType === "CONTRACTOR" && canEditEngineering(user.role),
      canProgress: base.party.partyType === "CONTRACTOR" && canRecordElementProgress(user.role),
    },
    stats: {
      elements: elements.length,
      rebarKg: elements.reduce((sum, e) => sum + e.rebarLines.reduce((s, r) => s + n(r.computedWeightKg), 0), 0),
      formworkM2: elements.reduce((sum, e) => sum + e.formworkLines.reduce((s, f) => s + n(f.computedAreaM2), 0), 0),
    },
    elements: elements.map((e) => ({
      id: e.id,
      type: e.elementType,
      floor: e.floor,
      axis: [e.axisFrom, e.axisTo].filter(Boolean).join(" - ") || "Unspecified",
      wbs: `${e.wbsNode.code} ${e.wbsNode.name}`,
      rebarKg: e.rebarLines.reduce((sum, r) => sum + n(r.computedWeightKg), 0),
      formworkM2: e.formworkLines.reduce((sum, f) => sum + n(f.computedAreaM2), 0),
      checkpoints: e.progress.filter((p) => p.completedDate).length,
    })),
  };
}

export async function getDocumentsWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const [documents, decisions, lessons] = await Promise.all([
    db.projectDocument.findMany({ where: { projectId }, include: { issuedBy: { select: { fullName: true } }, approvedBy: { select: { fullName: true } }, wbsNode: { select: { code: true, name: true } } }, orderBy: [{ docNo: "asc" }, { revisionNo: "desc" }], take: 30 }),
    db.decisionLog.findMany({ where: { projectId }, include: { madeBy: { select: { fullName: true } }, wbsNode: { select: { code: true, name: true } } }, orderBy: { decidedAt: "desc" }, take: 20 }),
    db.lessonsLearned.findMany({ where: { projectId }, include: { recordedBy: { select: { fullName: true } }, wbsNode: { select: { code: true, name: true } } }, orderBy: { recordedAt: "desc" }, take: 20 }),
  ]);
  return {
    permissions: {
      canIssue: canIssueDocument(user.role),
    },
    stats: {
      documents: documents.length,
      underReview: documents.filter((d) => d.status === "UNDER_REVIEW").length,
      decisions: decisions.length,
      lessons: lessons.length,
    },
    documents: documents.map((d) => ({ id: d.id, docNo: d.docNo, title: d.title, category: d.category, revision: d.revisionNo, status: d.status, filePath: d.filePath, issuedBy: d.issuedBy.fullName, approvedBy: d.approvedBy?.fullName ?? null, wbs: d.wbsNode ? `${d.wbsNode.code} ${d.wbsNode.name}` : "Project level" })),
    decisions: decisions.map((d) => ({ id: d.id, type: d.decisionType, decision: d.decision, madeBy: d.madeBy.fullName, decidedAt: iso(d.decidedAt), wbs: d.wbsNode ? `${d.wbsNode.code} ${d.wbsNode.name}` : "Project level" })),
    lessons: lessons.map((l) => ({ id: l.id, category: l.category, lesson: l.lesson, recommendation: l.recommendation, recordedBy: l.recordedBy.fullName, recordedAt: iso(l.recordedAt), wbs: l.wbsNode ? `${l.wbsNode.code} ${l.wbsNode.name}` : "Project level" })),
  };
}

export async function getProcurementWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const [orders, receipts, bids] = await Promise.all([
    db.purchaseOrder.findMany({ where: { projectId }, include: { supplier: { select: { name: true } }, items: true }, orderBy: { updatedAt: "desc" }, take: 25 }),
    db.materialReceipt.findMany({ where: { projectId }, include: { materialItem: true, purchaseOrder: { select: { poNo: true } }, receivedBy: { select: { fullName: true } } }, orderBy: { receiptDate: "desc" }, take: 25 }),
    db.bidTender.findMany({ where: { projectId }, include: { supplier: { select: { name: true } }, submittedBy: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" }, take: 25 }),
  ]);
  return {
    permissions: {
      canManagePo: base.party.partyType === "CONTRACTOR" && canManagePurchaseOrders(user.role),
      canApprovePo: base.party.partyType === "CONTRACTOR" && canApprovePurchaseOrder(user.role),
      canReceipt: base.party.partyType === "CONTRACTOR" && canRecordReceipt(user.role),
      canBid: base.party.partyType === "CONTRACTOR" && canManageBids(user.role),
    },
    stats: {
      orders: orders.length,
      openOrders: orders.filter((o) => !["RECEIVED", "CANCELLED"].includes(o.status)).length,
      receipts: receipts.length,
      bids: bids.length,
    },
    orders: orders.map((o) => ({ id: o.id, poNo: o.poNo, supplier: o.supplier.name, status: o.status, amount: base.scope.canViewCostDetail ? n(o.amount) : null, expectedDelivery: iso(o.expectedDelivery), itemCount: o.items.length })),
    receipts: receipts.map((r) => ({ id: r.id, poNo: r.purchaseOrder.poNo, material: r.materialItem.name, quantity: n(r.quantityReceived), receivedBy: r.receivedBy.fullName, receiptDate: iso(r.receiptDate) })),
    bids: bids.map((b) => ({ id: b.id, bidNo: b.bidNo, title: b.title, supplier: b.supplier?.name ?? "Open", result: b.result, amount: base.scope.canViewCostDetail ? n(b.amount) : null, submittedBy: b.submittedBy?.fullName ?? "Unassigned" })),
  };
}

export async function getReportsWorkspaceData(user: SessionUser, projectId: string) {
  const base = await getBase(user, projectId);
  if (!base) return null;
  const reports = await db.regulatoryReport.findMany({
    where: { projectId },
    orderBy: { generatedAt: "desc" },
    take: 30,
  });
  return {
    permissions: {
      canGenerate: canGenerateReport(user.role),
      canGenerateGrading: base.party.partyType === "CONTRACTOR",
    },
    stats: {
      total: reports.length,
      grading: reports.filter((r) => r.reportType === "GRADING_RENEWAL").length,
      progress: reports.filter((r) => r.reportType === "PROGRESS_SUBMISSION").length,
      safety: reports.filter((r) => r.reportType === "SAFETY_COMPLIANCE").length,
    },
    reports: reports.map((r) => ({ id: r.id, type: r.reportType, generatedAt: iso(r.generatedAt), filePath: r.filePath })),
  };
}

export type WorkspaceModuleData =
  | { tab: "daily"; data: NonNullable<Awaited<ReturnType<typeof getDailyWorkspaceData>>> }
  | { tab: "cost"; data: NonNullable<Awaited<ReturnType<typeof getCostWorkspaceData>>> }
  | { tab: "risk"; data: NonNullable<Awaited<ReturnType<typeof getRiskWorkspaceData>>> }
  | { tab: "safety"; data: NonNullable<Awaited<ReturnType<typeof getSafetyWorkspaceData>>> }
  | { tab: "quality"; data: NonNullable<Awaited<ReturnType<typeof getQualityWorkspaceData>>> }
  | { tab: "resources"; data: NonNullable<Awaited<ReturnType<typeof getResourcesWorkspaceData>>> }
  | { tab: "engineering"; data: NonNullable<Awaited<ReturnType<typeof getEngineeringWorkspaceData>>> }
  | { tab: "documents"; data: NonNullable<Awaited<ReturnType<typeof getDocumentsWorkspaceData>>> }
  | { tab: "procurement"; data: NonNullable<Awaited<ReturnType<typeof getProcurementWorkspaceData>>> }
  | { tab: "reports"; data: NonNullable<Awaited<ReturnType<typeof getReportsWorkspaceData>>> };

export async function getWorkspaceModuleData(
  user: SessionUser,
  projectId: string,
  tab: WorkspaceTab
): Promise<WorkspaceModuleData | null> {
  if (tab === "daily") {
    const data = await getDailyWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "cost") {
    const data = await getCostWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "risk") {
    const data = await getRiskWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "safety") {
    const data = await getSafetyWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "quality") {
    const data = await getQualityWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "resources") {
    const data = await getResourcesWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "engineering") {
    const data = await getEngineeringWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "documents") {
    const data = await getDocumentsWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "procurement") {
    const data = await getProcurementWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  if (tab === "reports") {
    const data = await getReportsWorkspaceData(user, projectId);
    return data ? { tab, data } : null;
  }
  return null;
}
