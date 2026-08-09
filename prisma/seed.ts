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
    "ReviewComment",
    "ScheduleChangeRequest",
    "ActivityAssignment",
    "SectionAssignment",
    "PendingDependencyRequest",
    "DisputeRecord",
    "Notification",
    "AuditLog",
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

  const concreteSub = await db.organization.create({
    data: {
      name: "Concrete Masters Subcontracting PLC",
      partyType: "SUBCONTRACTOR" as PartyType,
    },
  });

  const electricalSub = await db.organization.create({
    data: {
      name: "PowerTech Electrical Subcontracting PLC",
      partyType: "SUBCONTRACTOR" as PartyType,
    },
  });

  const materialSupplier = await db.organization.create({
    data: {
      name: "EthioBuild Materials Supply PLC",
      partyType: "SUPPLIER" as PartyType,
    },
  });

  const regulator = await db.organization.create({
    data: {
      name: "Ethiopian Construction Authority",
      partyType: "REGULATOR" as PartyType,
    },
  });

  // --- Users: multiple per functional role for contractor ---
  const contractorUsers: { role: UserRole; fullName: string; jobTitle: string; emailSuffix: string }[] = [
    // Admin
    { role: "ADMIN", fullName: "Alemayehu Bekele", jobTitle: "IT/MIS Manager", emailSuffix: "admin" },
    // Multiple Foremen
    { role: "FOREMAN", fullName: "Tesfaye Girma", jobTitle: "General Foreman", emailSuffix: "foreman1" },
    { role: "FOREMAN", fullName: "Kifle Alemu", jobTitle: "Rebar Foreman", emailSuffix: "foreman2" },
    { role: "FOREMAN", fullName: "Belete Tadesse", jobTitle: "Concrete Foreman", emailSuffix: "foreman3" },
    { role: "FOREMAN", fullName: "Dawit Abera", jobTitle: "Formwork Foreman", emailSuffix: "foreman4" },
    // Multiple Superintendents
    { role: "SUPERINTENDENT", fullName: "Mekonnen Alemu", jobTitle: "Structure Superintendent", emailSuffix: "superintendent1" },
    { role: "SUPERINTENDENT", fullName: "Abraham Tekle", jobTitle: "Civil Works Superintendent", emailSuffix: "superintendent2" },
    // Multiple Site Engineers
    { role: "SITE_ENGINEER", fullName: "Hanna Tadesse", jobTitle: "Site Engineer", emailSuffix: "siteengineer1" },
    { role: "SITE_ENGINEER", fullName: "Meron Kassa", jobTitle: "Structural Engineer", emailSuffix: "siteengineer2" },
    { role: "SITE_ENGINEER", fullName: "Yohannes Bekele", jobTitle: "Civil Engineer", emailSuffix: "siteengineer3" },
    // Management
    { role: "DEPUTY_PM", fullName: "Dawit Haile", jobTitle: "Deputy Project Manager", emailSuffix: "deputypm" },
    { role: "SENIOR_PM", fullName: "Selamawit Teshome", jobTitle: "Senior Project Manager", emailSuffix: "seniorpm" },
    // Quality & Safety
    { role: "QC_INSPECTOR", fullName: "Yonatan Assefa", jobTitle: "QC Inspector", emailSuffix: "qc1" },
    { role: "QC_INSPECTOR", fullName: "Kidanemariam Abebe", jobTitle: "Senior QC Inspector", emailSuffix: "qc2" },
    { role: "HSE_OFFICER", fullName: "Frehiwot Negash", jobTitle: "HSE Officer", emailSuffix: "hse1" },
    { role: "HSE_OFFICER", fullName: "Zerihun Mekonnen", jobTitle: "Senior HSE Officer", emailSuffix: "hse2" },
    // Commercial
    { role: "QS", fullName: "Biruk Solomon", jobTitle: "Quantity Surveyor", emailSuffix: "qs1" },
    { role: "QS", fullName: "Eleni Gebremariam", jobTitle: "Senior QS", emailSuffix: "qs2" },
    { role: "PROCUREMENT", fullName: "Sara Mohammed", jobTitle: "Procurement Officer", emailSuffix: "procurement" },
    { role: "FINANCE", fullName: "Kebede Mengistu", jobTitle: "Cost Controller", emailSuffix: "finance" },
    { role: "HR", fullName: "Liya Girma", jobTitle: "HR Officer", emailSuffix: "hr" },
    { role: "EQUIPMENT_MANAGER", fullName: "Nati Debebe", jobTitle: "Plant & Equipment Manager", emailSuffix: "equipment" },
    { role: "CONTRACTS_LEGAL", fullName: "Ruth Ayalew", jobTitle: "Contracts Manager", emailSuffix: "contracts" },
  ];

  const users = new Map<string, string>();

  for (const u of contractorUsers) {
    const created = await db.user.create({
      data: {
        organizationId: ovid.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`${u.role}_${u.emailSuffix}`, created.id);
  }

  // External party users - Consultant (multiple engineers)
  const consultantUsers = [
    { fullName: "Dr. Abebe Worku", emailSuffix: "consultant1", jobTitle: "Resident Engineer", role: "CONSULTANT_ENGINEER" as UserRole },
    { fullName: "Eng. Tigist Haile", emailSuffix: "consultant2", jobTitle: "Structural Engineer", role: "CONSULTANT_ENGINEER" as UserRole },
    { fullName: "Eng. Kassahun Bekele", emailSuffix: "consultant3", jobTitle: "Civil Engineer", role: "CONSULTANT_ENGINEER" as UserRole },
    { fullName: "Eng. Almaz Tadesse", emailSuffix: "qc_consultant", jobTitle: "QC Consultant", role: "QC_INSPECTOR" as UserRole },
  ];

  for (const u of consultantUsers) {
    const created = await db.user.create({
      data: {
        organizationId: united.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`consultant_${u.emailSuffix}`, created.id);
  }

  // Client users (multiple representatives)
  const clientUsers = [
    { fullName: "Aster Kifle", emailSuffix: "client1", jobTitle: "Client Representative", role: "CLIENT_REP" as UserRole },
    { fullName: "Mekonnen Desta", emailSuffix: "client2", jobTitle: "Project Manager", role: "CLIENT_REP" as UserRole },
    { fullName: "Selamawit Abebe", emailSuffix: "client3", jobTitle: "Technical Advisor", role: "CLIENT_REP" as UserRole },
  ];

  for (const u of clientUsers) {
    const created = await db.user.create({
      data: {
        organizationId: aacra.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`client_${u.emailSuffix}`, created.id);
  }

  // Subcontractor users - SteelWorks (multiple roles)
  const steelSubUsers = [
    { fullName: "Muluken Tafesse", emailSuffix: "steel_foreman1", jobTitle: "Steel Foreman", role: "FOREMAN" as UserRole },
    { fullName: "Girma Kassa", emailSuffix: "steel_foreman2", jobTitle: "Rebar Fixer Foreman", role: "FOREMAN" as UserRole },
    { fullName: "Tigist Bekele", emailSuffix: "steel_se1", jobTitle: "Steel Site Engineer", role: "SITE_ENGINEER" as UserRole },
    { fullName: "Abraham Yilma", emailSuffix: "steel_se2", jobTitle: "Structural Engineer", role: "SITE_ENGINEER" as UserRole },
    { fullName: "Kidanemariam Tekle", emailSuffix: "steel_qc", jobTitle: "QC Inspector", role: "QC_INSPECTOR" as UserRole },
  ];

  for (const u of steelSubUsers) {
    const created = await db.user.create({
      data: {
        organizationId: steelSub.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`steel_${u.emailSuffix}`, created.id);
  }

  // Subcontractor users - Concrete Masters
  const concreteSubUsers = [
    { fullName: "Dawit Zewdu", emailSuffix: "concrete_foreman1", jobTitle: "Concrete Foreman", role: "FOREMAN" as UserRole },
    { fullName: "Belete Mekonnen", emailSuffix: "concrete_foreman2", jobTitle: "Pouring Foreman", role: "FOREMAN" as UserRole },
    { fullName: "Eleni Tadesse", emailSuffix: "concrete_se1", jobTitle: "Concrete Site Engineer", role: "SITE_ENGINEER" as UserRole },
    { fullName: "Yohannes Abera", emailSuffix: "concrete_se2", jobTitle: "Civil Engineer", role: "SITE_ENGINEER" as UserRole },
  ];

  for (const u of concreteSubUsers) {
    const created = await db.user.create({
      data: {
        organizationId: concreteSub.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`concrete_${u.emailSuffix}`, created.id);
  }

  // Subcontractor users - PowerTech Electrical
  const electricalSubUsers = [
    { fullName: "Kifle Desta", emailSuffix: "electrical_foreman", jobTitle: "Electrical Foreman", role: "FOREMAN" as UserRole },
    { fullName: "Meron Bekele", emailSuffix: "electrical_se", jobTitle: "Electrical Engineer", role: "SITE_ENGINEER" as UserRole },
  ];

  for (const u of electricalSubUsers) {
    const created = await db.user.create({
      data: {
        organizationId: electricalSub.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`electrical_${u.emailSuffix}`, created.id);
  }

  // Supplier users
  const supplierUsers = [
    { fullName: "Tadesse Gebremariam", emailSuffix: "supplier1", jobTitle: "Sales Manager", role: "PROCUREMENT" as UserRole },
    { fullName: "Almaz Kassa", emailSuffix: "supplier2", jobTitle: "Logistics Coordinator", role: "PROCUREMENT" as UserRole },
  ];

  for (const u of supplierUsers) {
    const created = await db.user.create({
      data: {
        organizationId: materialSupplier.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`supplier_${u.emailSuffix}`, created.id);
  }

  // Regulator users
  const regulatorUsers = [
    { fullName: "Eng. Solomon Tekle", emailSuffix: "regulator1", jobTitle: "Senior Inspector", role: "CONSULTANT_ENGINEER" as UserRole },
    { fullName: "Eng. Zerihun Abebe", emailSuffix: "regulator2", jobTitle: "Compliance Officer", role: "CONSULTANT_ENGINEER" as UserRole },
  ];

  for (const u of regulatorUsers) {
    const created = await db.user.create({
      data: {
        organizationId: regulator.id,
        fullName: u.fullName,
        email: `${u.emailSuffix}@ovid.com`,
        passwordHash: hash(PASSWORD),
        jobTitle: u.jobTitle,
        role: u.role,
      },
    });
    users.set(`regulator_${u.emailSuffix}`, created.id);
  }

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
  // Contractor users
  for (const [key, userId] of users) {
    if (key.startsWith("FOREMAN_") || key.startsWith("SUPERINTENDENT_") || key.startsWith("SITE_ENGINEER_") ||
        key.startsWith("DEPUTY_PM_") || key.startsWith("SENIOR_PM_") || key.startsWith("QC_INSPECTOR_") ||
        key.startsWith("HSE_OFFICER_") || key.startsWith("QS_") || key.startsWith("PROCUREMENT_") ||
        key.startsWith("FINANCE_") || key.startsWith("HR_") || key.startsWith("EQUIPMENT_MANAGER_") ||
        key.startsWith("CONTRACTS_LEGAL_") || key.startsWith("ADMIN_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: ovid.id,
          projectRole: key.split("_")[1] === "admin" ? "IT/MIS Manager" : `${key.split("_")[0]} on project`,
        },
      });
    }
  }

  // Consultant users
  for (const [key, userId] of users) {
    if (key.startsWith("consultant_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: united.id,
          projectRole: key.split("_")[1] === "consultant1" ? "Resident Engineer" : "Consultant Engineer",
        },
      });
    }
  }

  // Client users
  for (const [key, userId] of users) {
    if (key.startsWith("client_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: aacra.id,
          projectRole: "Client Representative",
        },
      });
    }
  }

  // Subcontractor users - SteelWorks
  for (const [key, userId] of users) {
    if (key.startsWith("steel_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: steelSub.id,
          projectRole: key.split("_")[1].includes("foreman") ? "Subcontractor Foreman" : "Subcontractor Engineer",
        },
      });
    }
  }

  // Subcontractor users - Concrete Masters
  for (const [key, userId] of users) {
    if (key.startsWith("concrete_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: concreteSub.id,
          projectRole: key.split("_")[1].includes("foreman") ? "Subcontractor Foreman" : "Subcontractor Engineer",
        },
      });
    }
  }

  // Subcontractor users - PowerTech Electrical
  for (const [key, userId] of users) {
    if (key.startsWith("electrical_")) {
      await db.projectMembership.create({
        data: {
          projectId: project.id,
          userId,
          organizationId: electricalSub.id,
          projectRole: key.split("_")[1].includes("foreman") ? "Subcontractor Foreman" : "Subcontractor Engineer",
        },
      });
    }
  }

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
      wbsNodeId: slab.id,
      name: "Ground floor slab concrete pour",
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

  // --- Structural elements + takeoff lines (Engineering module) ---
  const element = await db.structuralElement.create({
    data: {
      wbsNodeId: wall4.id,
      elementType: "SHEAR_WALL",
      axisFrom: "a",
      axisTo: "c",
      floor: "Ground Floor",
    },
  });

  const wall4RebarWeightKg = 1.58 * 6.2 * 8 * 2;
  await db.rebarLine.create({
    data: {
      structuralElementId: element.id,
      barDesignation: "S1",
      diameterMm: 16,
      spacingM: 0.2,
      numberOfFaces: 2,
      numberOfBars: 8,
      spanM: 6.2,
      computedWeightKg: wall4RebarWeightKg,
    },
  });
  await db.formworkLine.create({
    data: {
      structuralElementId: element.id,
      segmentLabel: "Wall 4 face A-C",
      lengthM: 6.2,
      heightM: 3.0,
      computedAreaM2: 18.6,
    },
  });
  await db.elementProgress.createMany({
    data: [
      {
        structuralElementId: element.id,
        discipline: "REBAR",
        checkpoint: "Q1",
        completedDate: new Date(today.getFullYear(), 2, 12),
      },
      {
        structuralElementId: element.id,
        discipline: "FORMWORK",
        checkpoint: "Q1",
        completedDate: new Date(today.getFullYear(), 2, 14),
      },
    ],
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

  // --- Daily site reports (Daily module) ---
  const earthworkDaily = await db.earthworkDailyEntry.create({
    data: {
      projectId: project.id,
      wbsNodeId: foundation.id,
      date: new Date(today.getFullYear(), 2, 2),
      station: "0+120 to 0+180",
      activityDescription: "Foundation trench trimming and blinding preparation",
      equipmentType: "Excavator",
      equipmentPlateNo: "OV-EX-014",
      operatingHours: 6.5,
      idleHours: 1,
      downHours: 0,
      quantityLength: 60,
      quantityWidth: 1.2,
      quantityDepth: 0.45,
      manpower: { foreman: 1, mason: 4, laborer: 16 },
      remark: "Rain interrupted afternoon pour preparation",
      status: "APPROVED",
      createdById: users.get("FOREMAN_foreman1")!,
    },
  });
  await db.structureDailyEntry.create({
    data: {
      projectId: project.id,
      wbsNodeId: wall4.id,
      date: new Date(today.getFullYear(), 2, 12),
      activityDescription: "Wall 4 vertical starter bars fixed and checked",
      designQuantity: 18.6,
      actualQuantity: 12.4,
      materialUsed: "Ø16 rebar, binding wire",
      concreteGrade: "C30",
      labour: { steelFixer: 10, helper: 6 },
      equipmentType: "Tower crane",
      equipmentSerialNo: "TC-02",
      operatingHours: 3,
      idleHours: 0.5,
      downHours: 0,
      remark: "Awaiting consultant inspection before closing formwork",
      status: "SUBMITTED",
      createdById: users.get("SITE_ENGINEER_siteengineer1")!,
    },
  });
  const dailyRebarWeightKg = 1.58 * 5.8 * 96 * 2;
  await db.rebarDailyEntry.create({
    data: {
      projectId: project.id,
      wbsNodeId: wall4.id,
      date: new Date(today.getFullYear(), 2, 12),
      barDesignation: "W4-V16",
      diameterMm: 16,
      numberOfBars: 96,
      lengthM: 5.8,
      numberOfFaces: 2,
      computedWeightKg: dailyRebarWeightKg,
      shape: "Straight vertical",
      labour: { steelFixer: 10, helper: 6 },
      remark: "Bars tied at 200mm centers",
      status: "DRAFT",
      createdById: users.get("steel_steel_foreman1")!,
    },
  });
  await db.signOff.createMany({
    data: [
      {
        entityType: "EARTHWORK_DAILY",
        entityId: earthworkDaily.id,
        userId: users.get("SUPERINTENDENT_superintendent1")!,
        signOffRole: "SUPERINTENDENT",
        signedAt: new Date(today.getFullYear(), 2, 2, 17, 0),
        comment: "Verified against site quantities.",
      },
      {
        entityType: "EARTHWORK_DAILY",
        entityId: earthworkDaily.id,
        userId: users.get("DEPUTY_PM_deputypm")!,
        signOffRole: "DEPUTY_PM",
        signedAt: new Date(today.getFullYear(), 2, 3, 9, 0),
        comment: "Accepted.",
      },
      {
        entityType: "EARTHWORK_DAILY",
        entityId: earthworkDaily.id,
        userId: users.get("SENIOR_PM_seniorpm")!,
        signOffRole: "SENIOR_PM",
        signedAt: new Date(today.getFullYear(), 2, 3, 11, 0),
        comment: "Approved.",
      },
    ],
  });

  // --- Safety observation + incident (Safety module) ---
  const safetyObservation = await db.safetyObservation.create({
    data: {
      wbsNodeId: wall4.id,
      observedByUserId: users.get("HSE_OFFICER_hse1")!,
      hazardDescription: "Unguarded scaffolding edge on Wall 4",
      severity: "HIGH",
      immediateActionTaken: "Cordoned off area; guardrails ordered",
      observedAt: new Date(),
    },
  });
  await db.safetyIncident.create({
    data: {
      wbsNodeId: wall4.id,
      linkedObservationId: safetyObservation.id,
      incidentType: "NEAR_MISS",
      description: "Worker accessed Wall 4 scaffold before guardrail was fully reinstated",
      correctiveAction: "Installed guardrail, refreshed toolbox talk, and tagged scaffold access",
      correctiveActionVerifiedByUserId: users.get("HSE_OFFICER_hse1")!,
      status: "CLOSED",
      affectsScheduleActivityId: a2.id,
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
      {
        boqItemId: boqExcavation.id,
        costType: "ACTUAL",
        amount: 52500,
        sourceType: "EQUIPMENT_USAGE",
        sourceId: "EQ-EX-014",
        recordedAt: new Date(today.getFullYear(), 2, 2),
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
  await db.measurementEntry.create({
    data: {
      contractId: subContract.id,
      wbsNodeId: wall4.id,
      itemNo: "SUB-IPC-001",
      locationFrom: "Wall 4 south face",
      locationTo: "Wall 4 north face",
      length: 5.8,
      quantity: 1.76,
      unitRate: 98000,
      certificateNo: "SUB-IPC-001",
      status: "CERTIFIED",
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
      ownerId: users.get("QS_qs1")!,
      mitigationPlan: "Pre-order two weeks ahead; dual-source with local mill",
      status: "OPEN",
    },
  });

  // --- Quality: ITRs, defect log, and punch patterns ---
  const wallItr = await db.inspectionTestRecord.create({
    data: {
      wbsNodeId: wall4.id,
      inspectionType: "Pre-pour rebar inspection",
      result: "CONDITIONAL_PASS",
      inspectedByUserId: users.get("QC_INSPECTOR_qc1")!,
      inspectedAt: new Date(today.getFullYear(), 2, 13, 10, 30),
    },
  });
  const reworkActual = await db.costActual.create({
    data: {
      boqItemId: boqFormwork.id,
      costType: "ACTUAL",
      amount: 18500,
      sourceType: "INVOICE",
      sourceId: "DEF-W4-001",
      recordedAt: new Date(today.getFullYear(), 2, 14),
    },
  });
  await db.defectLog.create({
    data: {
      linkedItrId: wallItr.id,
      wbsNodeId: wall4.id,
      description: "Spacer blocks missing on south face rebar cage",
      responsibleOrgId: steelSub.id,
      reworkCostActualId: reworkActual.id,
      reworkDelayDays: 1,
      status: "REWORK_IN_PROGRESS",
    },
  });
  await db.punchListItem.createMany({
    data: [
      {
        wbsNodeId: wall4.id,
        description: "Honeycomb patch required below window opening",
        severity: "MAJOR",
        status: "OPEN",
        patternTag: "WALL_HONEYCOMB",
      },
      {
        wbsNodeId: slab.id,
        description: "Surface laitance removal required before waterproofing",
        severity: "MINOR",
        status: "RESOLVED",
        patternTag: "SURFACE_PREP",
      },
      {
        wbsNodeId: wall4.id,
        description: "Honeycomb patch required at edge return",
        severity: "MINOR",
        status: "OPEN",
        patternTag: "WALL_HONEYCOMB",
      },
    ],
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
        issuedByUserId: users.get("SITE_ENGINEER_siteengineer1")!,
        approvedById: users.get("consultant_consultant1")!,
        effectiveDate: new Date(today.getFullYear(), 0, 25),
      },
      {
        projectId: project.id,
        docNo: "S1-B3-MS-02",
        title: "Concrete pour method statement",
        category: "METHOD_STATEMENT",
        revisionNo: 1,
        status: "UNDER_REVIEW",
        issuedByUserId: users.get("SITE_ENGINEER_siteengineer1")!,
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
        madeByUserId: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        wbsNodeId: foundation.id,
        decisionType: "DELAY_RULING",
        decision: "Rains on Mar 1 classified as weather delay (no contractor fault)",
        rationale: "Site logs confirm; confirmed by resident engineer",
        madeByUserId: users.get("consultant_consultant1")!,
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
      recordedByUserId: users.get("QC_INSPECTOR_qc1")!,
    },
  });

  // --- Procurement: materials, PO to subcontractor, receipt ---
  const matRebar = await db.materialItem.create({
    data: { name: "Rebar Ø16", unit: "t", importDependent: true },
  });
  const matCement = await db.materialItem.create({
    data: { name: "Cement (P.42.5R)", unit: "bag", importDependent: false },
  });
  const rebarDemand = await db.materialDemand.create({
    data: {
      wbsNodeId: wall4.id,
      materialItemId: matRebar.id,
      neededByDate: new Date(today.getFullYear(), 2, 20),
      quantityNeeded: 8.4,
      quantityDelivered: 6.2,
    },
  });
  await db.materialDemand.create({
    data: {
      wbsNodeId: foundation.id,
      materialItemId: matCement.id,
      neededByDate: new Date(today.getFullYear(), 2, 8),
      quantityNeeded: 520,
      quantityDelivered: 480,
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
  await db.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po.id,
      materialItemId: matRebar.id,
      materialDemandId: rebarDemand.id,
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
      receivedByUserId: users.get("PROCUREMENT_procurement")!,
      remark: "Delivered to wall 4 staging",
    },
  });

  // --- Resources: labor, equipment, utilization, and custody ---
  const steelFixer = await db.employee.create({
    data: {
      organizationId: steelSub.id,
      fullName: "Kassahun Merga",
      profession: "Steel fixer",
      employmentType: "SUBCONTRACTOR_STAFF",
    },
  });
  const ovidMason = await db.employee.create({
    data: {
      organizationId: ovid.id,
      fullName: "Mulugeta Sileshi",
      profession: "Mason",
      employmentType: "PERMANENT",
    },
  });
  await db.laborAttendance.createMany({
    data: [
      {
        employeeId: steelFixer.id,
        date: new Date(today.getFullYear(), 2, 12),
        present: true,
        hours: 8,
      },
      {
        employeeId: ovidMason.id,
        date: new Date(today.getFullYear(), 2, 12),
        present: true,
        hours: 7.5,
      },
    ],
  });
  await db.laborAssignment.createMany({
    data: [
      {
        employeeId: steelFixer.id,
        wbsNodeId: wall4.id,
        date: new Date(today.getFullYear(), 2, 12),
        hoursOnTask: 8,
      },
      {
        employeeId: ovidMason.id,
        wbsNodeId: foundation.id,
        date: new Date(today.getFullYear(), 2, 12),
        hoursOnTask: 7.5,
      },
    ],
  });
  const excavator = await db.equipment.create({
    data: {
      organizationId: ovid.id,
      equipmentType: "Excavator",
      plateNo: "OV-EX-014",
      serialNo: "EX-2024-014",
    },
  });
  const rebarCutter = await db.equipment.create({
    data: {
      organizationId: steelSub.id,
      equipmentType: "Rebar cutter",
      serialNo: "SW-RC-07",
    },
  });
  await db.equipmentUsageLog.createMany({
    data: [
      {
        equipmentId: excavator.id,
        wbsNodeId: foundation.id,
        projectId: project.id,
        date: new Date(today.getFullYear(), 2, 2),
        operatingHours: 6.5,
        idleHours: 1,
        downHours: 0,
      },
      {
        equipmentId: rebarCutter.id,
        wbsNodeId: wall4.id,
        projectId: project.id,
        date: new Date(today.getFullYear(), 2, 12),
        operatingHours: 5,
        idleHours: 1.5,
        downHours: 0,
      },
    ],
  });
  await db.custodyLog.createMany({
    data: [
      {
        materialItemId: matRebar.id,
        fromLocation: "Main store",
        toLocation: "Wall 4 staging yard",
        transferredByUserId: users.get("PROCUREMENT_procurement")!,
        receivedByUserId: users.get("steel_steel_foreman1")!,
        transferredAt: new Date(today.getFullYear(), 2, 11, 8, 30),
        quantity: 6.2,
      },
      {
        equipmentId: rebarCutter.id,
        fromLocation: "SteelWorks workshop",
        toLocation: "Block 3 ground floor",
        transferredByUserId: users.get("steel_steel_foreman1")!,
        transferredAt: new Date(today.getFullYear(), 2, 12, 7, 30),
      },
    ],
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
      submittedByUserId: users.get("CONTRACTS_LEGAL_contracts")!,
    },
  });

  // --- Reports / compliance export register ---
  await db.regulatoryReport.createMany({
    data: [
      {
        projectId: project.id,
        reportType: "PROGRESS_SUBMISSION",
        generatedAt: new Date(today.getFullYear(), 2, 15, 9, 0),
        filePath: "/exports/seed-progress-submission.json",
      },
      {
        projectId: project.id,
        reportType: "SAFETY_COMPLIANCE",
        generatedAt: new Date(today.getFullYear(), 2, 15, 10, 0),
        filePath: "/exports/seed-safety-compliance.json",
      },
      {
        projectId: project.id,
        reportType: "GRADING_RENEWAL",
        generatedAt: new Date(today.getFullYear(), 2, 16, 8, 0),
        filePath: "/exports/seed-grading-renewal.json",
      },
    ],
  });

  // ============================================================
  // Phase 3-7 Seed — End-to-end demo data across multiple projects
  // ============================================================

  // --- Add SUBCONTRACTOR_PM users for each subcontractor ---
  const subPmSteel = await db.user.create({
    data: {
      organizationId: steelSub.id,
      fullName: "Tesfaye Mekonnen",
      email: "steel_pm@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Subcontractor Project Manager",
      role: "SUBCONTRACTOR_PM",
    },
  });
  users.set("steel_pm", subPmSteel.id);

  const subPmConcrete = await db.user.create({
    data: {
      organizationId: concreteSub.id,
      fullName: "Hailu Gebre",
      email: "concrete_pm@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Subcontractor PM",
      role: "SUBCONTRACTOR_PM",
    },
  });
  users.set("concrete_pm", subPmConcrete.id);

  const subPmElectrical = await db.user.create({
    data: {
      organizationId: electricalSub.id,
      fullName: "Yonas Tadesse",
      email: "electrical_pm@ovid.com",
      passwordHash: hash(PASSWORD),
      jobTitle: "Electrical Subcontractor Manager",
      role: "SUBCONTRACTOR_PM",
    },
  });
  users.set("electrical_pm", subPmElectrical.id);

  // Add them to project membership
  for (const [key, userId] of users) {
    if (key === "steel_pm") {
      await db.projectMembership.create({
        data: { projectId: project.id, userId, organizationId: steelSub.id, projectRole: "Subcontractor PM" },
      });
    }
    if (key === "concrete_pm") {
      await db.projectMembership.create({
        data: { projectId: project.id, userId, organizationId: concreteSub.id, projectRole: "Subcontractor PM" },
      });
    }
    if (key === "electrical_pm") {
      await db.projectMembership.create({
        data: { projectId: project.id, userId, organizationId: electricalSub.id, projectRole: "Subcontractor PM" },
      });
    }
  }

  // --- Activity assignments (link users to activities) ---
  await db.activityAssignment.createMany({
    data: [
      { scheduleActivityId: a1.id, userId: users.get("SITE_ENGINEER_siteengineer1")!, role: "SITE_ENGINEER", assignedById: users.get("SENIOR_PM_seniorpm")! },
      { scheduleActivityId: a1.id, userId: users.get("FOREMAN_foreman1")!, role: "FOREMAN", assignedById: users.get("SITE_ENGINEER_siteengineer1")! },
      { scheduleActivityId: a2.id, userId: users.get("steel_steel_se1")!, role: "SITE_ENGINEER", assignedById: users.get("steel_pm")! },
      { scheduleActivityId: a2.id, userId: users.get("steel_steel_foreman1")!, role: "FOREMAN", assignedById: users.get("steel_pm")! },
      { scheduleActivityId: a3.id, userId: users.get("concrete_concrete_se1")!, role: "SITE_ENGINEER", assignedById: users.get("concrete_pm")! },
      { scheduleActivityId: a3.id, userId: users.get("concrete_concrete_foreman1")!, role: "FOREMAN", assignedById: users.get("concrete_pm")! },
    ],
  });

  // --- Section assignments (SE/Super demo + Subcontractor PM WBS ownership) ---
  await db.sectionAssignment.createMany({
    data: [
      {
        projectId: project.id,
        userId: users.get("SITE_ENGINEER_siteengineer1")!,
        wbsNodeId: foundation.id,
        role: "SITE_ENGINEER_OWNER",
        assignedById: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        userId: users.get("SITE_ENGINEER_siteengineer2")!,
        wbsNodeId: gf.id,
        role: "SITE_ENGINEER_OWNER",
        assignedById: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        userId: users.get("SUPERINTENDENT_superintendent1")!,
        wbsNodeId: block.id,
        role: "SUPERINTENDENT_OWNER",
        assignedById: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        userId: users.get("SITE_ENGINEER_siteengineer3")!,
        wbsNodeId: slab.id,
        role: "SITE_ENGINEER_OWNER",
        assignedById: users.get("DEPUTY_PM_deputypm")!,
      },
      {
        projectId: project.id,
        userId: users.get("steel_pm")!,
        wbsNodeId: wall4.id,
        role: "SUBCONTRACTOR_OWNER",
        assignedById: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        userId: users.get("concrete_pm")!,
        wbsNodeId: slab.id,
        role: "SUBCONTRACTOR_OWNER",
        assignedById: users.get("SENIOR_PM_seniorpm")!,
      },
      {
        projectId: project.id,
        userId: users.get("electrical_pm")!,
        wbsNodeId: gf.id,
        role: "SUBCONTRACTOR_OWNER",
        assignedById: users.get("DEPUTY_PM_deputypm")!,
      },
    ],
  });

  // Sync subcontract org ceilings to assigned WBS roots
  await db.contract.update({
    where: { id: subContract.id },
    data: { scopeWbsNodeId: wall4.id, status: "ACTIVE" },
  });
  await db.contract.create({
    data: {
      projectId: project.id,
      parentContractId: mainContract.id,
      contractorOrgId: concreteSub.id,
      scopeDescription: "Concrete works subcontract",
      contractValue: 12000000,
      retentionPercent: 5,
      scopeWbsNodeId: slab.id,
      status: "ACTIVE",
    },
  });
  await db.contract.create({
    data: {
      projectId: project.id,
      parentContractId: mainContract.id,
      contractorOrgId: electricalSub.id,
      scopeDescription: "Electrical works subcontract",
      contractValue: 4500000,
      retentionPercent: 5,
      scopeWbsNodeId: gf.id,
      status: "ACTIVE",
    },
  });

  // --- Update WBS nodes with planned dates ---
  await db.wbsNode.updateMany({
    where: { projectId: project.id },
    data: {
      plannedStartDate: new Date(today.getFullYear(), 0, 10),
      plannedEndDate: new Date(today.getFullYear(), 9, 30),
    },
  });
  // Override specific dates per node
  await db.wbsNode.update({ where: { id: foundation.id }, data: { plannedStartDate: new Date(today.getFullYear(), 0, 10), plannedEndDate: new Date(today.getFullYear(), 2, 5) } });
  await db.wbsNode.update({ where: { id: wall4.id }, data: { plannedStartDate: new Date(today.getFullYear(), 2, 5), plannedEndDate: new Date(today.getFullYear(), 2, 28) } });
  await db.wbsNode.update({ where: { id: slab.id }, data: { plannedStartDate: new Date(today.getFullYear(), 2, 28), plannedEndDate: new Date(today.getFullYear(), 4, 15) } });
  await db.wbsNode.update({ where: { id: gf.id }, data: { plannedStartDate: new Date(today.getFullYear(), 2, 5), plannedEndDate: new Date(today.getFullYear(), 4, 15) } });

  // --- Review comments on the ITR result ---
  await db.reviewComment.createMany({
    data: [
      {
        projectId: project.id,
        entityType: "inspection",
        entityId: wallItr.id,
        userId: users.get("QC_INSPECTOR_qc1")!,
        body: "Conditional pass granted. Spacer blocks missing on south face — see defect log.",
        isDecision: true,
        decisionLabel: "CONDITIONAL_PASS",
      },
      {
        projectId: project.id,
        entityType: "inspection",
        entityId: wallItr.id,
        userId: users.get("SITE_ENGINEER_siteengineer2")!,
        body: "Acknowledged. We'll correct the spacers and schedule re-inspection.",
        parentId: null, // top-level reply
      },
      {
        projectId: project.id,
        entityType: "daily_report",
        entityId: earthworkDaily.id,
        userId: users.get("SUPERINTENDENT_superintendent1")!,
        body: "Verified quantities against site measurements. 60m trench length confirmed.",
        isDecision: true,
        decisionLabel: "APPROVED",
      },
    ],
  });

  // --- Dispute record (QC fail dispute) ---
  // Create a failed ITR to dispute
  const failedItr = await db.inspectionTestRecord.create({
    data: {
      wbsNodeId: wall4.id,
      inspectionType: "Concrete compressive strength test — Wall 4 pour",
      result: "FAIL",
      inspectedByUserId: users.get("QC_INSPECTOR_qc2")!,
      inspectedAt: new Date(today.getFullYear(), 2, 16, 14, 0),
    },
  });
  await db.defectLog.create({
    data: {
      linkedItrId: failedItr.id,
      wbsNodeId: wall4.id,
      description: "Concrete cylinder test results below C30 spec (28-day: 24.8 MPa)",
      status: "OPEN",
    },
  });
  await db.disputeRecord.create({
    data: {
      projectId: project.id,
      itrId: failedItr.id,
      wbsNodeId: wall4.id,
      disputedById: users.get("SITE_ENGINEER_siteengineer2")!,
      reason: "Cylinder was improperly cured at site. Request retest with field-cured cylinders per ASTM C31.",
      escalationTo: "Consultant Materials Engineer",
      status: "OPEN",
    },
  });

  // --- Schedule change request (a3 concrete pour pushed) ---
  await db.scheduleChangeRequest.create({
    data: {
      projectId: project.id,
      activityId: a3.id,
      requestedById: users.get("SITE_ENGINEER_siteengineer3")!,
      newStart: new Date(today.getFullYear(), 3, 1),
      newFinish: new Date(today.getFullYear(), 3, 5),
      reason: "Wall 4 rebar inspection delay pushed the pour window. Requesting 7-day extension.",
      status: "PENDING",
    },
  });

  // --- Notifications ---
  await db.notification.createMany({
    data: [
      {
        userId: users.get("SENIOR_PM_seniorpm")!,
        projectId: project.id,
        entityType: "schedule_change",
        entityId: "pending",
        type: "SCHEDULE_CHANGE_PENDING",
        message: "Site Engineer requested schedule change for 'Wall 4 concrete pour'",
      },
      {
        userId: users.get("SITE_ENGINEER_siteengineer2")!,
        projectId: project.id,
        entityType: "dispute",
        entityId: "pending",
        type: "DISPUTE_OPENED",
        message: "Your dispute on concrete test failure has been logged",
      },
      {
        userId: users.get("QC_INSPECTOR_qc1")!,
        projectId: project.id,
        entityType: "inspection",
        entityId: wallItr.id,
        type: "REVIEW_COMMENT_ADDED",
        message: "New comment added to inspection 'Pre-pour rebar inspection'",
      },
    ],
  });

  // --- Second project: Road project for multi-project visibility ---
  const roadProject = await db.project.create({
    data: {
      code: "RM-2024",
      name: "Ring Road Modernization — Lot 2 (12 km)",
      projectType: "ROAD",
      contractorOrgId: ovid.id,
      clientOrgId: aacra.id,
      consultantOrgId: united.id,
      contractValue: 245000000,
      contractType: "FIDIC_RED",
      plannedStartDate: new Date(today.getFullYear(), 1, 1),
      plannedEndDate: new Date(today.getFullYear(), 11, 30),
      actualStartDate: new Date(today.getFullYear(), 1, 5),
      status: "ACTIVE",
    },
  });
  const roadContract = await db.contract.create({
    data: {
      projectId: roadProject.id,
      contractorOrgId: ovid.id,
      scopeDescription: "Ring Road Lot 2 — 12 km dual carriageway",
      contractValue: 245000000,
      retentionPercent: 5,
    },
  });
  // Add a subcontract for road project
  await db.contract.create({
    data: {
      projectId: roadProject.id,
      parentContractId: roadContract.id,
      contractorOrgId: concreteSub.id,
      scopeDescription: "Concrete drainage structures — Ring Road Lot 2",
      contractValue: 18500000,
      retentionPercent: 5,
    },
  });

  // Add key users to road project
  const roadKeyUsers = [
    { key: "SENIOR_PM_seniorpm", orgId: ovid.id, role: "Senior PM" },
    { key: "DEPUTY_PM_deputypm", orgId: ovid.id, role: "Deputy PM" },
    { key: "SITE_ENGINEER_siteengineer1", orgId: ovid.id, role: "Site Engineer" },
    { key: "SITE_ENGINEER_siteengineer2", orgId: ovid.id, role: "Site Engineer" },
    { key: "SUPERINTENDENT_superintendent1", orgId: ovid.id, role: "Superintendent" },
    { key: "FOREMAN_foreman1", orgId: ovid.id, role: "Foreman" },
    { key: "FOREMAN_foreman2", orgId: ovid.id, role: "Foreman" },
    { key: "QC_INSPECTOR_qc1", orgId: ovid.id, role: "QC Inspector" },
    { key: "HSE_OFFICER_hse1", orgId: ovid.id, role: "HSE Officer" },
    { key: "QS_qs1", orgId: ovid.id, role: "QS" },
    { key: "PROCUREMENT_procurement", orgId: ovid.id, role: "Procurement" },
    { key: "FINANCE_finance", orgId: ovid.id, role: "Finance" },
    { key: "EQUIPMENT_MANAGER_equipment", orgId: ovid.id, role: "Equipment" },
    { key: "consultant_consultant1", orgId: united.id, role: "Consultant Engineer" },
    { key: "client_client1", orgId: aacra.id, role: "Client Rep" },
    { key: "concrete_pm", orgId: concreteSub.id, role: "Subcontractor PM" },
    { key: "concrete_concrete_foreman1", orgId: concreteSub.id, role: "Foreman" },
    { key: "concrete_concrete_se1", orgId: concreteSub.id, role: "Site Engineer" },
  ];
  for (const u of roadKeyUsers) {
    const uid = users.get(u.key);
    if (uid) {
      await db.projectMembership.create({
        data: { projectId: roadProject.id, userId: uid, organizationId: u.orgId, projectRole: u.role },
      });
    }
  }

  // --- Road project WBS ---
  const roadPhase1 = await db.wbsNode.create({
    data: { projectId: roadProject.id, code: "RM-L2-S1", name: "Section 1: 0+000 to 6+000", nodeType: "SECTION", designReady: true, plannedStartDate: new Date(today.getFullYear(), 1, 1), plannedEndDate: new Date(today.getFullYear(), 6, 30) },
  });
  const roadPhase2 = await db.wbsNode.create({
    data: { projectId: roadProject.id, code: "RM-L2-S2", name: "Section 2: 6+000 to 12+000", nodeType: "SECTION", designReady: true, plannedStartDate: new Date(today.getFullYear(), 6, 1), plannedEndDate: new Date(today.getFullYear(), 11, 30) },
  });
  const roadEarthwork = await db.wbsNode.create({
    data: { projectId: roadProject.id, parentId: roadPhase1.id, code: "RM-L2-S1-EW", name: "Earthworks & subgrade preparation", nodeType: "ACTIVITY", designReady: true, plannedStartDate: new Date(today.getFullYear(), 1, 1), plannedEndDate: new Date(today.getFullYear(), 3, 15) },
  });
  const roadDrainage = await db.wbsNode.create({
    data: { projectId: roadProject.id, parentId: roadPhase1.id, code: "RM-L2-S1-DR", name: "Drainage structures (culverts, ditches)", nodeType: "ACTIVITY", designReady: true, plannedStartDate: new Date(today.getFullYear(), 3, 1), plannedEndDate: new Date(today.getFullYear(), 5, 30) },
  });
  const roadBase = await db.wbsNode.create({
    data: { projectId: roadProject.id, parentId: roadPhase1.id, code: "RM-L2-S1-BC", name: "Base course & asphalt paving", nodeType: "ACTIVITY", designReady: false, plannedStartDate: new Date(today.getFullYear(), 5, 1), plannedEndDate: new Date(today.getFullYear(), 6, 30) },
  });
  const roadBridge = await db.wbsNode.create({
    data: { projectId: roadProject.id, parentId: roadPhase2.id, code: "RM-L2-S2-BR", name: "Bridge structure at km 8+500", nodeType: "STRUCTURAL_ELEMENT", designReady: true, plannedStartDate: new Date(today.getFullYear(), 6, 1), plannedEndDate: new Date(today.getFullYear(), 10, 30) },
  });

  // --- Road project schedule activities ---
  const roadA1 = await db.scheduleActivity.create({
    data: { wbsNodeId: roadEarthwork.id, name: "Bulk excavation & embankment 0+000–3+000", baselineStart: new Date(today.getFullYear(), 1, 5), baselineFinish: new Date(today.getFullYear(), 3, 1), plannedStart: new Date(today.getFullYear(), 1, 5), plannedFinish: new Date(today.getFullYear(), 3, 10), actualStart: new Date(today.getFullYear(), 1, 8), status: "IN_PROGRESS", progressPercent: 55 },
  });
  const roadA2 = await db.scheduleActivity.create({
    data: { wbsNodeId: roadEarthwork.id, name: "Bulk excavation & embankment 3+000–6+000", baselineStart: new Date(today.getFullYear(), 2, 1), baselineFinish: new Date(today.getFullYear(), 3, 15), plannedStart: new Date(today.getFullYear(), 2, 1), plannedFinish: new Date(today.getFullYear(), 3, 15), status: "NOT_STARTED" },
  });
  const roadA3 = await db.scheduleActivity.create({
    data: { wbsNodeId: roadDrainage.id, name: "Box culvert at km 2+500", baselineStart: new Date(today.getFullYear(), 3, 5), baselineFinish: new Date(today.getFullYear(), 4, 15), plannedStart: new Date(today.getFullYear(), 3, 5), plannedFinish: new Date(today.getFullYear(), 4, 20), status: "NOT_STARTED" },
  });
  const roadA4 = await db.scheduleActivity.create({
    data: { wbsNodeId: roadDrainage.id, name: "Side drain construction 0+000–6+000", baselineStart: new Date(today.getFullYear(), 4, 1), baselineFinish: new Date(today.getFullYear(), 5, 30), plannedStart: new Date(today.getFullYear(), 4, 1), plannedFinish: new Date(today.getFullYear(), 5, 30), status: "NOT_STARTED" },
  });
  // Overdue activity: planned finish was 2 months ago
  const roadA5 = await db.scheduleActivity.create({
    data: { wbsNodeId: roadBridge.id, name: "Bridge foundation piles", baselineStart: new Date(today.getFullYear(), 6, 1), baselineFinish: new Date(today.getFullYear(), 7, 15), plannedStart: new Date(today.getFullYear(), 6, 1), plannedFinish: new Date(today.getFullYear(), 7, 15), status: "NOT_STARTED" },
  });

  // Road activity assignments
  await db.activityAssignment.createMany({
    data: [
      { scheduleActivityId: roadA1.id, userId: users.get("SITE_ENGINEER_siteengineer1")!, role: "SITE_ENGINEER", assignedById: users.get("SENIOR_PM_seniorpm")! },
      { scheduleActivityId: roadA1.id, userId: users.get("FOREMAN_foreman1")!, role: "FOREMAN", assignedById: users.get("SITE_ENGINEER_siteengineer1")! },
      { scheduleActivityId: roadA2.id, userId: users.get("SITE_ENGINEER_siteengineer2")!, role: "SITE_ENGINEER", assignedById: users.get("SENIOR_PM_seniorpm")! },
      { scheduleActivityId: roadA3.id, userId: users.get("concrete_concrete_se1")!, role: "SITE_ENGINEER", assignedById: users.get("concrete_pm")! },
      { scheduleActivityId: roadA3.id, userId: users.get("concrete_concrete_foreman1")!, role: "FOREMAN", assignedById: users.get("concrete_concrete_se1")! },
    ],
  });

  // Road schedule dependencies
  await db.scheduleDependency.create({ data: { predecessorId: roadA1.id, successorId: roadA2.id, dependencyType: "FS", lagDays: 0 } });
  await db.scheduleDependency.create({ data: { predecessorId: roadA1.id, successorId: roadA3.id, dependencyType: "FS", lagDays: 5 } });
  await db.scheduleDependency.create({ data: { predecessorId: roadA2.id, successorId: roadA4.id, dependencyType: "FS", lagDays: 0 } });

  // --- Road project BoQ items ---
  await db.boqItem.createMany({
    data: [
      { wbsNodeId: roadEarthwork.id, itemCode: "RM-L2-EW-01", description: "Bulk excavation (common)", unit: "m3", budgetedQuantity: 95000, unitRate: 185 },
      { wbsNodeId: roadEarthwork.id, itemCode: "RM-L2-EW-02", description: "Embankment fill (compacted)", unit: "m3", budgetedQuantity: 72000, unitRate: 220 },
      { wbsNodeId: roadDrainage.id, itemCode: "RM-L2-DR-01", description: "Box culvert reinforced concrete", unit: "m3", budgetedQuantity: 2400, unitRate: 8500 },
      { wbsNodeId: roadBase.id, itemCode: "RM-L2-BC-01", description: "Crushed aggregate base course", unit: "m3", budgetedQuantity: 18000, unitRate: 950 },
      { wbsNodeId: roadBase.id, itemCode: "RM-L2-BC-02", description: "Asphalt concrete wearing course", unit: "t", budgetedQuantity: 12000, unitRate: 4200 },
      { wbsNodeId: roadBridge.id, itemCode: "RM-L2-BR-01", description: "Bored cast-in-place piles Ø1.0m", unit: "m", budgetedQuantity: 320, unitRate: 12500 },
    ],
  });

  // --- Road cost actuals ---
  const roadBoqItems = await db.boqItem.findMany({ where: { wbsNode: { projectId: roadProject.id } }, select: { id: true, itemCode: true } });
  const roadBoqExcavation = roadBoqItems.find((b) => b.itemCode === "RM-L2-EW-01")!;
  await db.costActual.createMany({
    data: [
      { boqItemId: roadBoqExcavation.id, costType: "ACTUAL", amount: 8500000, sourceType: "EQUIPMENT_USAGE", sourceId: "EQ-RM-001", recordedAt: new Date(today.getFullYear(), 2, 15) },
      { boqItemId: roadBoqExcavation.id, costType: "COMMITTED", amount: 12000000, sourceType: "PURCHASE_ORDER", sourceId: "PO-RM-001", recordedAt: new Date(today.getFullYear(), 1, 20) },
    ],
  });

  // --- Road measurement entries ---
  await db.measurementEntry.create({
    data: { contractId: roadContract.id, wbsNodeId: roadEarthwork.id, itemNo: "IPC-RM-001", locationFrom: "0+000", locationTo: "3+000", quantity: 52000, unitRate: 185, certificateNo: "IPC-RM-001", status: "SUBMITTED" },
  });

  // --- Road ITRs ---
  await db.inspectionTestRecord.create({
    data: { wbsNodeId: roadEarthwork.id, inspectionType: "Subgrade compaction test", result: "PASS", inspectedByUserId: users.get("QC_INSPECTOR_qc1")!, inspectedAt: new Date(today.getFullYear(), 2, 10, 11, 0) },
  });
  await db.inspectionTestRecord.create({
    data: { wbsNodeId: roadEarthwork.id, inspectionType: "Embankment layer density", result: "PASS", inspectedByUserId: users.get("QC_INSPECTOR_qc1")!, inspectedAt: new Date(today.getFullYear(), 2, 20, 14, 30) },
  });

  // --- Road safety observation ---
  await db.safetyObservation.create({
    data: { wbsNodeId: roadEarthwork.id, observedByUserId: users.get("HSE_OFFICER_hse1")!, hazardDescription: "Excavation edge within 1m of traffic lane without barriers", severity: "HIGH", immediateActionTaken: "Installed temporary concrete barriers and warning signs", observedAt: new Date(today.getFullYear(), 2, 5) },
  });

  // --- Road documents ---
  await db.projectDocument.createMany({
    data: [
      { projectId: roadProject.id, wbsNodeId: roadEarthwork.id, docNo: "RM-L2-DWG-001", title: "Typical cross-section 0+000–6+000", category: "DRAWING", revisionNo: 3, status: "ISSUED", issuedByUserId: users.get("SITE_ENGINEER_siteengineer1")!, approvedById: users.get("consultant_consultant1")! },
      { projectId: roadProject.id, wbsNodeId: roadBridge.id, docNo: "RM-L2-DWG-002", title: "Bridge general arrangement at km 8+500", category: "DRAWING", revisionNo: 1, status: "DRAFT", issuedByUserId: users.get("SITE_ENGINEER_siteengineer2")! },
    ],
  });

  // --- Update contracts with status for the original project ---
  await db.contract.updateMany({
    where: { projectId: project.id },
    data: { status: "ACTIVE" },
  });
  await db.contract.updateMany({
    where: { projectId: roadProject.id },
    data: { status: "ACTIVE" },
  });

  console.log("E2E seed data added: 2 projects, all phases covered.");
  console.log("Demo credentials (password = password123):");
  console.log("  Contractor: foreman1@ovid.com, foreman2@ovid.com, foreman3@ovid.com, foreman4@ovid.com");
  console.log("              superintendent1@ovid.com, superintendent2@ovid.com");
  console.log("              siteengineer1@ovid.com, siteengineer2@ovid.com, siteengineer3@ovid.com");
  console.log("              seniorpm@ovid.com, deputypm@ovid.com");
  console.log("              qc1@ovid.com, qc2@ovid.com, hse1@ovid.com, hse2@ovid.com");
  console.log("              qs1@ovid.com, qs2@ovid.com, procurement@ovid.com, finance@ovid.com");
  console.log("              hr@ovid.com, equipment@ovid.com, contracts@ovid.com, admin@ovid.com");
  console.log("  Consultant: consultant1@ovid.com, consultant2@ovid.com, consultant3@ovid.com, qc_consultant@ovid.com");
  console.log("  Client: client1@ovid.com, client2@ovid.com, client3@ovid.com");
  console.log("  Subcontractor (Steel): steel_foreman1@ovid.com, steel_foreman2@ovid.com, steel_se1@ovid.com, steel_se2@ovid.com, steel_qc@ovid.com, steel_pm@ovid.com");
  console.log("  Subcontractor (Concrete): concrete_foreman1@ovid.com, concrete_foreman2@ovid.com, concrete_se1@ovid.com, concrete_se2@ovid.com, concrete_pm@ovid.com");
  console.log("  Subcontractor (Electrical): electrical_foreman@ovid.com, electrical_se@ovid.com, electrical_pm@ovid.com");
  console.log("  Supplier: supplier1@ovid.com, supplier2@ovid.com");
  console.log("  Regulator: regulator1@ovid.com, regulator2@ovid.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
