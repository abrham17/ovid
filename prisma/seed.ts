import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import type {
  PartyType,
  UserRole,
  WBSNodeType,
} from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PASSWORD = "password123";

function hash(password: string) {
  return bcrypt.hashSync(password, 10);
}

// ---------------------------------------------------------------
// Wipe in reverse dependency order for idempotency.
// ---------------------------------------------------------------
async function wipe() {
  const tables = [
    "AuditLog",
    "RegulatoryReport",
    "ElementProgress",
    "FormworkLine",
    "RebarLine",
    "WeightFactor",
    "StructuralElement",
    "CustodyLog",
    "MaterialDemand",
    "MaterialItem",
    "EquipmentUsageLog",
    "Equipment",
    "LaborAssignment",
    "LaborAttendance",
    "Employee",
    "PunchListItem",
    "DefectLog",
    "InspectionTestRecord",
    "SafetyIncident",
    "SafetyObservation",
    "RiskEntry",
    "VariationOrder",
    "MeasurementEntry",
    "CostActual",
    "BoQItem",
    "StoppageEntry",
    "ScheduleDependency",
    "ScheduleActivity",
    "WBSNode",
    "Contract",
    "Project",
    "SignOff",
    "DocumentTemplate",
    "ProjectMembership",
    "User",
    "Organization",
    "EarthworkDailyEntry",
    "StructureDailyEntry",
    "RebarDailyEntry",
    "MaterialReceipt",
    "PurchaseOrderItem",
    "PurchaseOrder",
    "BidTender",
    "LessonsLearned",
    "DecisionLog",
    "ProjectDocument",
  ];
  for (const t of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
  }
}

// ---------------------------------------------------------------
// Seed
// ---------------------------------------------------------------
async function main() {
  await wipe();
  console.log("Seeding Ovid PMS demo data…");

  // --- Organizations (Layer 1 parties) ---
  const ovid = await db.organization.create({
    data: {
      name: "Ovid Construction PLC",
      nameAmharic: "ኦቪድ ኮንስትራክሽን ኃ.የተ.የግ",
      partyType: "CONTRACTOR" as PartyType,
      contractorGrade: "GRADE_1",
      licenseNumber: "MUDC/G1/2024/0188",
      taxId: "ET-0045123456",
    },
  });

  const aacra = await db.organization.create({
    data: {
      name: "Addis Ababa City Roads Authority",
      partyType: "CLIENT" as PartyType,
    },
  });

  const united = await db.organization.create({
    data: {
      name: "United Consulting Engineers PLC",
      partyType: "CONSULTANT" as PartyType,
    },
  });

  const steelSub = await db.organization.create({
    data: {
      name: "SteelWorks Subcontracting PLC",
      partyType: "SUBCONTRACTOR" as PartyType,
    },
  });

  // --- Users: one per functional role ---
  const contractorRoles: { role: UserRole; fullName: string; jobTitle: string }[] = [
    { role: "ADMIN", fullName: "Alemayehu Bekele", jobTitle: "IT/MIS Manager" },
    { role: "FOREMAN", fullName: "Tesfaye Girma", jobTitle: "General Foreman" },
    { role: "SUPERINTENDENT", fullName: "Mekonnen Alemu", jobTitle: "Structure Superintendent" },
    { role: "SITE_ENGINEER", fullName: "Hanna Tadesse", jobTitle: "Site Engineer" },
    { role: "DEPUTY_PM", fullName: "Dawit Haile", jobTitle: "Deputy Project Manager" },
    { role: "SENIOR_PM", fullName: "Selamawit Teshome", jobTitle: "Senior Project Manager" },
    { role: "QC_INSPECTOR", fullName: "Yonatan Assefa", jobTitle: "QC Inspector" },
    { role: "HSE_OFFICER", fullName: "Frehiwot Negash", jobTitle: "HSE Officer" },
    { role: "QS", fullName: "Biruk Solomon", jobTitle: "Quantity Surveyor" },
    { role: "PROCUREMENT", fullName: "Sara Mohammed", jobTitle: "Procurement Officer" },
    { role: "FINANCE", fullName: "Kebede Mengistu", jobTitle: "Cost Controller" },
    { role: "HR", fullName: "Liya Girma", jobTitle: "HR Officer" },
    { role: "EQUIPMENT_MANAGER", fullName: "Nati Debebe", jobTitle: "Plant & Equipment Manager" },
    { role: "CONTRACTS_LEGAL", fullName: "Ruth Ayalew", jobTitle: "Contracts Manager" },
  ];

  const users = new Map<UserRole, string>();

  for (const u of contractorRoles) {
    const created = await db.user.create({
      data: {
        organizationId: ovid.id,
        fullName: u.fullName,
        email: `${u.role.toLowerCase()}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(u.role, created.id);
  }

  // External party users
  const consultantEng = await db.user.create({
    data: {
      organizationId: united.id,
      fullName: "Dr. Abebe Worku",
      email: "consultant@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Resident Engineer",
      role: "CONSULTANT_ENGINEER" as UserRole,
    },
  });

  const clientRep = await db.user.create({
    data: {
      organizationId: aacra.id,
      fullName: "Aster Kifle",
      email: "client@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Client Representative",
      role: "CLIENT_REP" as UserRole,
    },
  });

  const subForeman = await db.user.create({
    data: {
      organizationId: steelSub.id,
      fullName: "Muluken Tafesse",
      email: "subcontractor@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Subcontractor Foreman",
      role: "FOREMAN" as UserRole,
    },
  });

  // --- Demo project ---
  const today = new Date();
  const project = await db.project.create({
    data: {
      code: "S1-B3",
      name: "Sector 1 Block 3 (mother land) — Housing Development",
      projectType: "HOUSING",
      contractorOrgId: ovid.id,
      clientOrgId: aacra.id,
      consultantOrgId: united.id,
      contractValue: 85000000,
      contractType: "FIDIC_RED",
      plannedStartDate: new Date(today.getFullYear(), 0, 10),
      plannedEndDate: new Date(today.getFullYear(), 9, 30),
      actualStartDate: new Date(today.getFullYear(), 0, 12),
      status: "ACTIVE",
    },
  });

  const mainContract = await db.contract.create({
    data: {
      projectId: project.id,
      contractorOrgId: ovid.id,
      scopeDescription: "Main contract — housing block construction",
      contractValue: 85000000,
      retentionPercent: 5,
    },
  });

  const subContract = await db.contract.create({
    data: {
      projectId: project.id,
      parentContractId: mainContract.id,
      contractorOrgId: steelSub.id,
      scopeDescription: "Steel rebar supply & fixing subcontract",
      contractValue: 9800000,
      retentionPercent: 5,
    },
  });

  // --- Project memberships (Layer 1 links) ---
  for (const [role, userId] of users) {
    await db.projectMembership.create({
      data: {
        projectId: project.id,
        userId,
        organizationId: ovid.id,
        projectRole: role === "ADMIN" ? "IT/MIS Manager" : `${role} on project`,
      },
    });
  }
  await db.projectMembership.create({
    data: {
      projectId: project.id,
      userId: consultantEng.id,
      organizationId: united.id,
      projectRole: "Resident Engineer",
    },
  });
  await db.projectMembership.create({
    data: {
      projectId: project.id,
      userId: clientRep.id,
      organizationId: aacra.id,
      projectRole: "Client Representative",
    },
  });
  await db.projectMembership.create({
    data: {
      projectId: project.id,
      userId: subForeman.id,
      organizationId: steelSub.id,
      projectRole: "Subcontractor Foreman",
    },
  });

  // --- Document templates (the IMS register, file 06 §1) ---
  await db.documentTemplate.createMany({
    data: [
      {
        docNo: "IMS/OF/ENG/018",
        title: "Earth Work Daily Report Format",
        issuingDepartment: "ENG",
        revisionNo: 2,
        effectiveDate: today,
        formSchema: { entity: "EarthworkDailyEntry" },
      },
      {
        docNo: "IMS/001",
        title: "Structure Daily Report Format",
        issuingDepartment: "ENG",
        revisionNo: 2,
        effectiveDate: today,
        formSchema: { entity: "StructureDailyEntry" },
      },
      {
        docNo: "IMS/OF/ENG/019",
        title: "Bar Schedule (Rebar) Daily Report Format",
        issuingDepartment: "ENG",
        revisionNo: 2,
        effectiveDate: today,
        formSchema: { entity: "RebarDailyEntry" },
      },
      {
        docNo: "IMS/002",
        title: "Daily Time Sheet Report Format",
        issuingDepartment: "HR",
        revisionNo: 2,
        effectiveDate: today,
        formSchema: { entity: "LaborAttendance" },
      },
    ],
  });

  // --- Weight factors (bar diameter → kg/m, file 05 §1.3) ---
  await db.weightFactor.createMany({
    data: [
      { diameterMm: 8, kgPerMeter: 0.395 },
      { diameterMm: 10, kgPerMeter: 0.617 },
      { diameterMm: 12, kgPerMeter: 0.888 },
      { diameterMm: 14, kgPerMeter: 1.21 },
      { diameterMm: 16, kgPerMeter: 1.58 },
      { diameterMm: 18, kgPerMeter: 2.0 },
      { diameterMm: 20, kgPerMeter: 2.47 },
      { diameterMm: 22, kgPerMeter: 2.98 },
      { diameterMm: 24, kgPerMeter: 3.55 },
    ],
  });

  // --- WBS tree (Sector 1 → Block 3 → floors → elements) ---
  const phase = await db.wbsNode.create({
    data: {
      projectId: project.id,
      code: "S1",
      name: "Substructure",
      nodeType: "PHASE" as WBSNodeType,
      designReady: true,
    },
  });

  const block = await db.wbsNode.create({
    data: {
      projectId: project.id,
      parentId: phase.id,
      code: "S1-B3",
      name: "Block 3",
      nodeType: "SECTION" as WBSNodeType,
      designReady: true,
    },
  });

  const gf = await db.wbsNode.create({
    data: {
      projectId: project.id,
      parentId: block.id,
      code: "S1-B3-GF",
      name: "Ground Floor",
      nodeType: "FLOOR" as WBSNodeType,
      designReady: true,
    },
  });

  const wall4 = await db.wbsNode.create({
    data: {
      projectId: project.id,
      parentId: gf.id,
      code: "S1-B3-GF-W4",
      name: "Wall 4 — between axes a–c on axis 4–5",
      nodeType: "STRUCTURAL_ELEMENT" as WBSNodeType,
      designReady: true,
    },
  });

  const slab = await db.wbsNode.create({
    data: {
      projectId: project.id,
      parentId: gf.id,
      code: "S1-B3-GF-S1",
      name: "Slab 1 — Ground Floor",
      nodeType: "STRUCTURAL_ELEMENT" as WBSNodeType,
      designReady: true,
    },
  });

  const foundation = await db.wbsNode.create({
    data: {
      projectId: project.id,
      parentId: phase.id,
      code: "S1-FDN",
      name: "Foundation works",
      nodeType: "ACTIVITY" as WBSNodeType,
      designReady: true,
    },
  });

  // --- Schedule activities + dependencies ---
  const a1 = await db.scheduleActivity.create({
    data: {
      wbsNodeId: foundation.id,
      name: "Excavation & foundation concrete",
      baselineStart: new Date(today.getFullYear(), 0, 15),
      baselineFinish: new Date(today.getFullYear(), 2, 5),
      plannedStart: new Date(today.getFullYear(), 0, 15),
      plannedFinish: new Date(today.getFullYear(), 2, 8),
      actualStart: new Date(today.getFullYear(), 0, 18),
      status: "IN_PROGRESS",
      progressPercent: 72,
    },
  });

  const a2 = await db.scheduleActivity.create({
    data: {
      wbsNodeId: wall4.id,
      name: "Wall 4 rebar & formwork",
      baselineStart: new Date(today.getFullYear(), 2, 8),
      baselineFinish: new Date(today.getFullYear(), 2, 22),
      plannedStart: new Date(today.getFullYear(), 2, 8),
      plannedFinish: new Date(today.getFullYear(), 2, 25),
      status: "IN_PROGRESS",
      progressPercent: 40,
    },
  });

  const a3 = await db.scheduleActivity.create({
    data: {
      wbsNodeId: wall4.id,
      name: "Wall 4 concrete pour",
      baselineStart: new Date(today.getFullYear(), 2, 22),
      baselineFinish: new Date(today.getFullYear(), 2, 24),
      plannedStart: new Date(today.getFullYear(), 2, 25),
      plannedFinish: new Date(today.getFullYear(), 2, 27),
      status: "NOT_STARTED",
    },
  });

  await db.scheduleDependency.create({
    data: { predecessorId: a1.id, successorId: a2.id, dependencyType: "FS", lagDays: 0 },
  });
  await db.scheduleDependency.create({
    data: { predecessorId: a2.id, successorId: a3.id, dependencyType: "FS", lagDays: 0 },
  });

  // --- Structural element + rebar line (auto-weight demo) ---
  const element = await db.structuralElement.create({
    data: {
      wbsNodeId: wall4.id,
      elementType: "SHEAR_WALL",
      axisFrom: "a",
      axisTo: "c",
      floor: "Ground Floor",
    },
  });

  await db.rebarLine.create({
    data: {
      structuralElementId: element.id,
      barDesignation: "S1",
      diameterMm: 16,
      spacingM: 0.2,
      numberOfFaces: 2,
      numberOfBars: 8,
      spanM: 6.2,
    },
  });

  // --- Example stoppage (three-party delay-cause record) ---
  await db.stoppageEntry.create({
    data: {
      projectId: project.id,
      wbsNodeId: foundation.id,
      scheduleActivityId: a1.id,
      stoppageType: "WEATHER",
      reason: "Heavy rain halted concrete pour",
      startTime: new Date(today.getFullYear(), 2, 1, 8, 0),
      endTime: new Date(today.getFullYear(), 2, 1, 15, 0),
      inspectorComment: "Confirmed rainfall on site",
      contractorRepComment: "Ready to resume on dry weather",
      residentEngineerComment: "Approved resumption; duration noted",
      responsibleParty: "NEUTRAL",
    },
  });

  // --- Example safety observation ---
  await db.safetyObservation.create({
    data: {
      wbsNodeId: wall4.id,
      observedByUserId: users.get("HSE_OFFICER")!,
      hazardDescription: "Unguarded scaffolding edge on Wall 4",
      severity: "HIGH",
      immediateActionTaken: "Cordoned off area; guardrails ordered",
      observedAt: new Date(),
    },
  });

  // ============================================================
  // Phase 2 seed — Cost, Risk, Documents, Procurement, Quality
  // ============================================================

  // --- BoQ items (budget baseline per WBS node) ---
  const boqRebar = await db.boqItem.create({
    data: {
      wbsNodeId: wall4.id,
      itemCode: "B3-GF-W4-R",
      description: "Rebar Ø16 fixing (wall 4)",
      unit: "t",
      budgetedQuantity: 6.2,
      unitRate: 98000,
    },
  });
  const boqFormwork = await db.boqItem.create({
    data: {
      wbsNodeId: wall4.id,
      itemCode: "B3-GF-W4-F",
      description: "Wall formwork (contact area)",
      unit: "m2",
      budgetedQuantity: 240,
      unitRate: 650,
    },
  });
  const boqConcrete = await db.boqItem.create({
    data: {
      wbsNodeId: foundation.id,
      itemCode: "B3-FDN-C",
      description: "Concrete C25 (foundation)",
      unit: "m3",
      budgetedQuantity: 120,
      unitRate: 3200,
    },
  });
  const boqExcavation = await db.boqItem.create({
    data: {
      wbsNodeId: foundation.id,
      itemCode: "B3-FDN-E",
      description: "Bulk excavation",
      unit: "m3",
      budgetedQuantity: 400,
      unitRate: 150,
    },
  });
  await db.boqItem.create({
    data: {
      wbsNodeId: slab.id,
      itemCode: "B3-GF-S1-C",
      description: "Concrete C30 (ground floor slab)",
      unit: "m3",
      budgetedQuantity: 180,
      unitRate: 3400,
    },
  });

  // --- Cost actuals (committed + actual spend against BoQ) ---
  await db.costActual.createMany({
    data: [
      {
        boqItemId: boqRebar.id,
        costType: "COMMITTED",
        amount: 340000,
        sourceType: "PURCHASE_ORDER",
        sourceId: "PO-0001",
        recordedAt: new Date(today.getFullYear(), 1, 20),
      },
      {
        boqItemId: boqRebar.id,
        costType: "ACTUAL",
        amount: 305000,
        sourceType: "INVOICE",
        sourceId: "INV-0142",
        recordedAt: new Date(today.getFullYear(), 2, 10),
      },
      {
        boqItemId: boqConcrete.id,
        costType: "COMMITTED",
        amount: 240000,
        sourceType: "PURCHASE_ORDER",
        sourceId: "PO-0002",
        recordedAt: new Date(today.getFullYear(), 1, 5),
      },
    ],
  });

  // --- IPC / subcontract measurement (digital twin, file 06 §2.6) ---
  await db.measurementEntry.create({
    data: {
      contractId: mainContract.id,
      wbsNodeId: wall4.id,
      itemNo: "IPC-001",
      locationFrom: "Axis A",
      locationTo: "Axis C",
      length: 6.2,
      width: 3.0,
      quantity: 18.6,
      unitRate: 98000,
      certificateNo: "IPC-001",
      status: "DRAFT",
    },
  });

  // --- Variation order (contractor-prepared; day-work digital twin) ---
  await db.variationOrder.create({
    data: {
      projectId: project.id,
      wbsNodeId: wall4.id,
      itemNo: "VO-001",
      workDescription: "Additional dowel bars at Wall 4 construction joint",
      equipmentUsed: { crane: "1 hr" },
      manpowerUsed: { steelFixer: 12 },
      materialUsed: { rebar16: 0.9 },
      costImpact: 88500,
      timeImpactDays: 2,
      status: "CONTRACTOR_PREPARED",
    },
  });

  // --- Risk register (mandatory named owner) ---
  await db.riskEntry.create({
    data: {
      projectId: project.id,
      wbsNodeId: foundation.id,
      category: "FX_IMPORT",
      description: "Imported rebar price spike / foreign-currency shortage delays supply",
      likelihood: 4,
      impact: 3,
      ownerId: users.get("QS")!,
      mitigationPlan: "Pre-order two weeks ahead; dual-source with local mill",
      status: "OPEN",
    },
  });

  // --- Project document repository (ISO 9001 §7.5) ---
  await db.projectDocument.createMany({
    data: [
      {
        projectId: project.id,
        wbsNodeId: wall4.id,
        docNo: "S1-B3-GF-W4-DWG-01",
        title: "Wall 4 structural drawing",
        category: "DRAWING",
        revisionNo: 2,
        status: "ISSUED",
        issuedByUserId: users.get("SITE_ENGINEER")!,
        approvedById: consultantEng.id,
        effectiveDate: new Date(today.getFullYear(), 0, 25),
      },
      {
        projectId: project.id,
        docNo: "S1-B3-MS-02",
        title: "Concrete pour method statement",
        category: "METHOD_STATEMENT",
        revisionNo: 1,
        status: "UNDER_REVIEW",
        issuedByUserId: users.get("SITE_ENGINEER")!,
      },
    ],
  });
  const drawing = await db.projectDocument.findUnique({
    where: {
      projectId_docNo_revisionNo: {
        projectId: project.id,
        docNo: "S1-B3-GF-W4-DWG-01",
        revisionNo: 2,
      },
    },
  });

  // --- Decision log ---
  await db.decisionLog.createMany({
    data: [
      {
        projectId: project.id,
        wbsNodeId: wall4.id,
        documentId: drawing?.id ?? null,
        decisionType: "DESIGN_CHANGE",
        decision: "Accept revised dowel-bar detailing on Wall 4",
        rationale: "Matches updated consultant drawing DWG-01 rev 2",
        madeByUserId: users.get("SENIOR_PM")!,
      },
      {
        projectId: project.id,
        wbsNodeId: foundation.id,
        decisionType: "DELAY_RULING",
        decision: "Rains on Mar 1 classified as weather delay (no contractor fault)",
        rationale: "Site logs confirm; confirmed by resident engineer",
        madeByUserId: consultantEng.id,
      },
    ],
  });

  // --- Lessons learned ---
  await db.lessonsLearned.create({
    data: {
      projectId: project.id,
      wbsNodeId: foundation.id,
      phase: "EXECUTION",
      category: "CONCRETE_WORKS",
      lesson: "Order concrete only after rebar inspection sign-off to avoid idle crews",
      recommendation: "Gate batching on ITR approval",
      recordedByUserId: users.get("QC_INSPECTOR")!,
    },
  });

  // --- Procurement: materials, PO to subcontractor, receipt ---
  const matRebar = await db.materialItem.create({
    data: { name: "Rebar Ø16", unit: "t", importDependent: true },
  });
  const matCement = await db.materialItem.create({
    data: { name: "Cement (P.42.5R)", unit: "bag", importDependent: false },
  });
  await db.materialDemand.create({
    data: {
      wbsNodeId: wall4.id,
      materialItemId: matRebar.id,
      neededByDate: new Date(today.getFullYear(), 2, 20),
      quantityNeeded: 8.4,
      quantityDelivered: 6.2,
    },
  });
  const po = await db.purchaseOrder.create({
    data: {
      projectId: project.id,
      supplierOrgId: steelSub.id,
      poNo: "PO-0001",
      status: "PARTIAL_RECEIVED",
      issueDate: new Date(today.getFullYear(), 1, 18),
      expectedDelivery: new Date(today.getFullYear(), 2, 5),
      amount: 607600,
    },
  });
  const poItem = await db.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po.id,
      materialItemId: matRebar.id,
      materialDemandId: (await db.materialDemand.findFirst({ where: { materialItemId: matRebar.id } }))?.id ?? null,
      wbsNodeId: wall4.id,
      quantityOrdered: 6.2,
      unitPrice: 98000,
      quantityReceived: 6.2,
    },
  });
  await db.materialReceipt.create({
    data: {
      purchaseOrderId: po.id,
      materialItemId: matRebar.id,
      wbsNodeId: wall4.id,
      projectId: project.id,
      quantityReceived: 6.2,
      receiptDate: new Date(today.getFullYear(), 2, 2),
      receivedByUserId: users.get("PROCUREMENT")!,
      remark: "Delivered to wall 4 staging",
    },
  });

  // --- Bid/tender registry ---
  await db.bidTender.create({
    data: {
      projectId: project.id,
      supplierOrgId: steelSub.id,
      bidNo: "TEN-011",
      title: "Supply & fix rebar — Block 3 substructure",
      amount: 9800000,
      submittedAt: new Date(today.getFullYear(), 0, 8),
      result: "WON",
      submittedByUserId: users.get("CONTRACTS_LEGAL")!,
    },
  });

  console.log("Seed complete.");
  console.log("Demo credentials (all): email = <ROLE>@ovid.com or client@/consultant@/subcontractor@ovid.com, password = password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
