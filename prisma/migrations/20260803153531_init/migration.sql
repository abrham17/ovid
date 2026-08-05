-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CONTRACTOR', 'CLIENT', 'CONSULTANT', 'SUBCONTRACTOR', 'SUPPLIER', 'REGULATOR');

-- CreateEnum
CREATE TYPE "ContractorGrade" AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FOREMAN', 'SUPERINTENDENT', 'SITE_ENGINEER', 'DEPUTY_PM', 'SENIOR_PM', 'QC_INSPECTOR', 'HSE_OFFICER', 'QS', 'PROCUREMENT', 'FINANCE', 'HR', 'EQUIPMENT_MANAGER', 'CONTRACTS_LEGAL', 'CONSULTANT_ENGINEER', 'CLIENT_REP', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocDept" AS ENUM ('ENG', 'QC', 'HSE', 'FINANCE', 'HR', 'PROCUREMENT', 'CONTRACTS');

-- CreateEnum
CREATE TYPE "SignOffRole" AS ENUM ('FOREMAN', 'SUPERINTENDENT', 'DEPUTY_PM', 'SENIOR_PM', 'CONTRACTOR_PREPARED_BY', 'CONTRACTOR_CHECKED_BY', 'CONSULTANT_CHECKED_BY', 'CONSULTANT_APPROVED_BY', 'RESIDENT_ENGINEER', 'WORK_INSPECTOR', 'CONTRACTOR_REP');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('ROAD', 'BUILDING', 'HOUSING', 'ENERGY', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('FIDIC_RED', 'FIDIC_YELLOW', 'LOCAL_STANDARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'SUSPENDED', 'COMPLETE', 'CLOSED');

-- CreateEnum
CREATE TYPE "WBSNodeType" AS ENUM ('PHASE', 'SECTION', 'FLOOR', 'STATION_RANGE', 'STRUCTURAL_ELEMENT', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- CreateEnum
CREATE TYPE "StoppageType" AS ENUM ('WEATHER', 'DESIGN_CHANGE', 'MATERIAL_SHORTAGE', 'CLIENT_INSTRUCTION', 'EQUIPMENT_BREAKDOWN', 'LABOR_DISPUTE', 'FORCE_MAJEURE', 'CONTRACTOR_DEFAULT', 'OTHER');

-- CreateEnum
CREATE TYPE "ResponsibleParty" AS ENUM ('CLIENT', 'CONSULTANT', 'CONTRACTOR', 'SUBCONTRACTOR', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('COMMITTED', 'ACTUAL');

-- CreateEnum
CREATE TYPE "CostSourceType" AS ENUM ('PURCHASE_ORDER', 'INVOICE', 'PAYROLL', 'EQUIPMENT_USAGE', 'VARIATION_ORDER');

-- CreateEnum
CREATE TYPE "MeasurementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONSULTANT_QUERIED', 'CERTIFIED', 'PAID');

-- CreateEnum
CREATE TYPE "VariationOrderStatus" AS ENUM ('DRAFT', 'CONTRACTOR_PREPARED', 'CONTRACTOR_CHECKED', 'CONSULTANT_CHECKED', 'CONSULTANT_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('DESIGN', 'PROCUREMENT', 'WEATHER', 'FX_IMPORT', 'GEOTECHNICAL', 'REGULATORY', 'LABOR', 'SECURITY_THEFT', 'FINANCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'CLOSED', 'REALIZED');

-- CreateEnum
CREATE TYPE "SafetySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('NEAR_MISS', 'FIRST_AID', 'MEDICAL_TREATMENT', 'LOST_TIME', 'FATALITY');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACTION_PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ITRResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'REWORK_IN_PROGRESS', 'VERIFIED_CLOSED');

-- CreateEnum
CREATE TYPE "PunchSeverity" AS ENUM ('MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "PunchStatus" AS ENUM ('OPEN', 'RESOLVED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'DAILY_CASUAL', 'SUBCONTRACTOR_STAFF');

-- CreateEnum
CREATE TYPE "StructuralElementType" AS ENUM ('SHEAR_WALL', 'BEAM', 'SLAB', 'STAIRCASE', 'COLUMN', 'FOOTING', 'NON_SHEAR_WALL');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('REBAR', 'FORMWORK', 'CONCRETE');

-- CreateEnum
CREATE TYPE "Checkpoint" AS ENUM ('Q1', 'Q2', 'Q3');

-- CreateEnum
CREATE TYPE "RegulatoryReportType" AS ENUM ('GRADING_RENEWAL', 'PROGRESS_SUBMISSION', 'SAFETY_COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAmharic" TEXT,
    "partyType" "PartyType" NOT NULL,
    "contractorGrade" "ContractorGrade",
    "licenseNumber" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "signatureImageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectRole" TEXT NOT NULL,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuingDepartment" "DocDept" NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "supersededById" TEXT,
    "formSchema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignOff" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signOffRole" "SignOffRole" NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "SignOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "contractorOrgId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "consultantOrgId" TEXT,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentContractId" TEXT,
    "contractorOrgId" TEXT NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "retentionPercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WBSNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nodeType" "WBSNodeType" NOT NULL,
    "designReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WBSNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleActivity" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baselineStart" TIMESTAMP(3) NOT NULL,
    "baselineFinish" TIMESTAMP(3) NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedFinish" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "progressPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "status" "ActivityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDependency" (
    "id" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduleDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoppageEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "scheduleActivityId" TEXT,
    "stoppageType" "StoppageType" NOT NULL,
    "reason" TEXT NOT NULL,
    "stationFrom" TEXT,
    "stationTo" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "resourcesAssigned" JSONB,
    "inspectorComment" TEXT,
    "contractorRepComment" TEXT,
    "residentEngineerComment" TEXT,
    "responsibleParty" "ResponsibleParty",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoppageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoQItem" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "budgetedQuantity" DECIMAL(18,3) NOT NULL,
    "unitRate" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostActual" (
    "id" TEXT NOT NULL,
    "boqItemId" TEXT NOT NULL,
    "costType" "CostType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "sourceType" "CostSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostActual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementEntry" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "locationFrom" TEXT,
    "locationTo" TEXT,
    "side" TEXT,
    "length" DECIMAL(18,3),
    "width" DECIMAL(18,3),
    "depth" DECIMAL(18,3),
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitRate" DECIMAL(18,2) NOT NULL,
    "certificateNo" TEXT,
    "status" "MeasurementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeasurementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariationOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "itemNo" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "equipmentUsed" JSONB,
    "manpowerUsed" JSONB,
    "materialUsed" JSONB,
    "costImpact" DECIMAL(18,2),
    "timeImpactDays" INTEGER,
    "status" "VariationOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "category" "RiskCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mitigationPlan" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "realizedAsStoppageId" TEXT,
    "realizedAsVariationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyObservation" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "observedByUserId" TEXT NOT NULL,
    "hazardDescription" TEXT NOT NULL,
    "severity" "SafetySeverity" NOT NULL,
    "immediateActionTaken" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "linkedObservationId" TEXT,
    "incidentType" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "correctiveAction" TEXT,
    "correctiveActionVerifiedByUserId" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "affectsScheduleActivityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTestRecord" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "result" "ITRResult" NOT NULL,
    "inspectedByUserId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionTestRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectLog" (
    "id" TEXT NOT NULL,
    "linkedItrId" TEXT,
    "wbsNodeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleOrgId" TEXT,
    "reworkCostActualId" TEXT,
    "reworkDelayDays" INTEGER,
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefectLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PunchListItem" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "PunchSeverity" NOT NULL,
    "status" "PunchStatus" NOT NULL DEFAULT 'OPEN',
    "patternTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborAttendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "LaborAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hoursOnTask" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "LaborAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "plateNo" TEXT,
    "serialNo" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentUsageLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "operatingHours" DECIMAL(6,2) NOT NULL,
    "idleHours" DECIMAL(6,2) NOT NULL,
    "downHours" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "EquipmentUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "importDependent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialDemand" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "neededByDate" DATE NOT NULL,
    "quantityNeeded" DECIMAL(18,3) NOT NULL,
    "quantityDelivered" DECIMAL(18,3) NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyLog" (
    "id" TEXT NOT NULL,
    "materialItemId" TEXT,
    "equipmentId" TEXT,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "transferredByUserId" TEXT NOT NULL,
    "receivedByUserId" TEXT,
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(18,3),

    CONSTRAINT "CustodyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StructuralElement" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "elementType" "StructuralElementType" NOT NULL,
    "axisFrom" TEXT,
    "axisTo" TEXT,
    "floor" TEXT,
    "templateElementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StructuralElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightFactor" (
    "diameterMm" INTEGER NOT NULL,
    "kgPerMeter" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "WeightFactor_pkey" PRIMARY KEY ("diameterMm")
);

-- CreateTable
CREATE TABLE "RebarLine" (
    "id" TEXT NOT NULL,
    "structuralElementId" TEXT NOT NULL,
    "barDesignation" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "spacingM" DECIMAL(6,3),
    "numberOfFaces" INTEGER NOT NULL,
    "numberOfBars" INTEGER NOT NULL,
    "spanM" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "RebarLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormworkLine" (
    "id" TEXT NOT NULL,
    "structuralElementId" TEXT NOT NULL,
    "segmentLabel" TEXT,
    "lengthM" DECIMAL(12,3) NOT NULL,
    "heightM" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "FormworkLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementProgress" (
    "id" TEXT NOT NULL,
    "structuralElementId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "checkpoint" "Checkpoint" NOT NULL,
    "completedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reportType" "RegulatoryReportType" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT NOT NULL,

    CONSTRAINT "RegulatoryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_partyType_idx" ON "Organization"("partyType");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "ProjectMembership_userId_idx" ON "ProjectMembership"("userId");

-- CreateIndex
CREATE INDEX "ProjectMembership_organizationId_idx" ON "ProjectMembership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_projectId_userId_organizationId_key" ON "ProjectMembership"("projectId", "userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_docNo_key" ON "DocumentTemplate"("docNo");

-- CreateIndex
CREATE INDEX "SignOff_entityType_entityId_idx" ON "SignOff"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SignOff_userId_idx" ON "SignOff"("userId");

-- CreateIndex
CREATE INDEX "SignOff_signOffRole_idx" ON "SignOff"("signOffRole");

-- CreateIndex
CREATE INDEX "Project_contractorOrgId_idx" ON "Project"("contractorOrgId");

-- CreateIndex
CREATE INDEX "Project_clientOrgId_idx" ON "Project"("clientOrgId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "Contract_parentContractId_idx" ON "Contract"("parentContractId");

-- CreateIndex
CREATE INDEX "WBSNode_parentId_idx" ON "WBSNode"("parentId");

-- CreateIndex
CREATE INDEX "WBSNode_projectId_nodeType_idx" ON "WBSNode"("projectId", "nodeType");

-- CreateIndex
CREATE UNIQUE INDEX "WBSNode_projectId_code_key" ON "WBSNode"("projectId", "code");

-- CreateIndex
CREATE INDEX "ScheduleActivity_wbsNodeId_idx" ON "ScheduleActivity"("wbsNodeId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_status_idx" ON "ScheduleActivity"("status");

-- CreateIndex
CREATE INDEX "ScheduleDependency_predecessorId_idx" ON "ScheduleDependency"("predecessorId");

-- CreateIndex
CREATE INDEX "ScheduleDependency_successorId_idx" ON "ScheduleDependency"("successorId");

-- CreateIndex
CREATE INDEX "StoppageEntry_projectId_idx" ON "StoppageEntry"("projectId");

-- CreateIndex
CREATE INDEX "StoppageEntry_wbsNodeId_idx" ON "StoppageEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "StoppageEntry_scheduleActivityId_idx" ON "StoppageEntry"("scheduleActivityId");

-- CreateIndex
CREATE INDEX "StoppageEntry_stoppageType_idx" ON "StoppageEntry"("stoppageType");

-- CreateIndex
CREATE INDEX "BoQItem_wbsNodeId_idx" ON "BoQItem"("wbsNodeId");

-- CreateIndex
CREATE INDEX "CostActual_boqItemId_idx" ON "CostActual"("boqItemId");

-- CreateIndex
CREATE INDEX "CostActual_costType_idx" ON "CostActual"("costType");

-- CreateIndex
CREATE INDEX "CostActual_sourceType_sourceId_idx" ON "CostActual"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "MeasurementEntry_contractId_idx" ON "MeasurementEntry"("contractId");

-- CreateIndex
CREATE INDEX "MeasurementEntry_wbsNodeId_idx" ON "MeasurementEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "MeasurementEntry_status_idx" ON "MeasurementEntry"("status");

-- CreateIndex
CREATE INDEX "VariationOrder_projectId_idx" ON "VariationOrder"("projectId");

-- CreateIndex
CREATE INDEX "VariationOrder_wbsNodeId_idx" ON "VariationOrder"("wbsNodeId");

-- CreateIndex
CREATE INDEX "VariationOrder_status_idx" ON "VariationOrder"("status");

-- CreateIndex
CREATE INDEX "RiskEntry_projectId_idx" ON "RiskEntry"("projectId");

-- CreateIndex
CREATE INDEX "RiskEntry_wbsNodeId_idx" ON "RiskEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "RiskEntry_ownerId_idx" ON "RiskEntry"("ownerId");

-- CreateIndex
CREATE INDEX "RiskEntry_status_idx" ON "RiskEntry"("status");

-- CreateIndex
CREATE INDEX "RiskEntry_category_idx" ON "RiskEntry"("category");

-- CreateIndex
CREATE INDEX "SafetyObservation_wbsNodeId_idx" ON "SafetyObservation"("wbsNodeId");

-- CreateIndex
CREATE INDEX "SafetyObservation_severity_idx" ON "SafetyObservation"("severity");

-- CreateIndex
CREATE INDEX "SafetyObservation_observedAt_idx" ON "SafetyObservation"("observedAt");

-- CreateIndex
CREATE INDEX "SafetyIncident_wbsNodeId_idx" ON "SafetyIncident"("wbsNodeId");

-- CreateIndex
CREATE INDEX "SafetyIncident_status_idx" ON "SafetyIncident"("status");

-- CreateIndex
CREATE INDEX "SafetyIncident_incidentType_idx" ON "SafetyIncident"("incidentType");

-- CreateIndex
CREATE INDEX "InspectionTestRecord_wbsNodeId_idx" ON "InspectionTestRecord"("wbsNodeId");

-- CreateIndex
CREATE INDEX "InspectionTestRecord_result_idx" ON "InspectionTestRecord"("result");

-- CreateIndex
CREATE INDEX "DefectLog_wbsNodeId_idx" ON "DefectLog"("wbsNodeId");

-- CreateIndex
CREATE INDEX "DefectLog_status_idx" ON "DefectLog"("status");

-- CreateIndex
CREATE INDEX "PunchListItem_wbsNodeId_idx" ON "PunchListItem"("wbsNodeId");

-- CreateIndex
CREATE INDEX "PunchListItem_status_idx" ON "PunchListItem"("status");

-- CreateIndex
CREATE INDEX "PunchListItem_patternTag_idx" ON "PunchListItem"("patternTag");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_employmentType_idx" ON "Employee"("employmentType");

-- CreateIndex
CREATE UNIQUE INDEX "LaborAttendance_employeeId_date_key" ON "LaborAttendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "LaborAssignment_employeeId_date_idx" ON "LaborAssignment"("employeeId", "date");

-- CreateIndex
CREATE INDEX "LaborAssignment_wbsNodeId_idx" ON "LaborAssignment"("wbsNodeId");

-- CreateIndex
CREATE INDEX "Equipment_organizationId_idx" ON "Equipment"("organizationId");

-- CreateIndex
CREATE INDEX "EquipmentUsageLog_equipmentId_date_idx" ON "EquipmentUsageLog"("equipmentId", "date");

-- CreateIndex
CREATE INDEX "EquipmentUsageLog_projectId_idx" ON "EquipmentUsageLog"("projectId");

-- CreateIndex
CREATE INDEX "EquipmentUsageLog_wbsNodeId_idx" ON "EquipmentUsageLog"("wbsNodeId");

-- CreateIndex
CREATE INDEX "MaterialItem_name_idx" ON "MaterialItem"("name");

-- CreateIndex
CREATE INDEX "MaterialDemand_wbsNodeId_idx" ON "MaterialDemand"("wbsNodeId");

-- CreateIndex
CREATE INDEX "MaterialDemand_materialItemId_idx" ON "MaterialDemand"("materialItemId");

-- CreateIndex
CREATE INDEX "MaterialDemand_neededByDate_idx" ON "MaterialDemand"("neededByDate");

-- CreateIndex
CREATE INDEX "CustodyLog_materialItemId_idx" ON "CustodyLog"("materialItemId");

-- CreateIndex
CREATE INDEX "CustodyLog_equipmentId_idx" ON "CustodyLog"("equipmentId");

-- CreateIndex
CREATE INDEX "CustodyLog_receivedByUserId_idx" ON "CustodyLog"("receivedByUserId");

-- CreateIndex
CREATE INDEX "CustodyLog_transferredAt_idx" ON "CustodyLog"("transferredAt");

-- CreateIndex
CREATE INDEX "StructuralElement_wbsNodeId_idx" ON "StructuralElement"("wbsNodeId");

-- CreateIndex
CREATE INDEX "StructuralElement_templateElementId_idx" ON "StructuralElement"("templateElementId");

-- CreateIndex
CREATE INDEX "RebarLine_structuralElementId_idx" ON "RebarLine"("structuralElementId");

-- CreateIndex
CREATE INDEX "FormworkLine_structuralElementId_idx" ON "FormworkLine"("structuralElementId");

-- CreateIndex
CREATE UNIQUE INDEX "ElementProgress_structuralElementId_discipline_checkpoint_key" ON "ElementProgress"("structuralElementId", "discipline", "checkpoint");

-- CreateIndex
CREATE INDEX "RegulatoryReport_projectId_idx" ON "RegulatoryReport"("projectId");

-- CreateIndex
CREATE INDEX "RegulatoryReport_reportType_idx" ON "RegulatoryReport"("reportType");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_changedAt_idx" ON "AuditLog"("changedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignOff" ADD CONSTRAINT "SignOff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_consultantOrgId_fkey" FOREIGN KEY ("consultantOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contractorOrgId_fkey" FOREIGN KEY ("contractorOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSNode" ADD CONSTRAINT "WBSNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WBSNode" ADD CONSTRAINT "WBSNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleActivity" ADD CONSTRAINT "ScheduleActivity_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoppageEntry" ADD CONSTRAINT "StoppageEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoppageEntry" ADD CONSTRAINT "StoppageEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoppageEntry" ADD CONSTRAINT "StoppageEntry_scheduleActivityId_fkey" FOREIGN KEY ("scheduleActivityId") REFERENCES "ScheduleActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoQItem" ADD CONSTRAINT "BoQItem_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostActual" ADD CONSTRAINT "CostActual_boqItemId_fkey" FOREIGN KEY ("boqItemId") REFERENCES "BoQItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOrder" ADD CONSTRAINT "VariationOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationOrder" ADD CONSTRAINT "VariationOrder_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEntry" ADD CONSTRAINT "RiskEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEntry" ADD CONSTRAINT "RiskEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEntry" ADD CONSTRAINT "RiskEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEntry" ADD CONSTRAINT "RiskEntry_realizedAsStoppageId_fkey" FOREIGN KEY ("realizedAsStoppageId") REFERENCES "StoppageEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEntry" ADD CONSTRAINT "RiskEntry_realizedAsVariationId_fkey" FOREIGN KEY ("realizedAsVariationId") REFERENCES "VariationOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_observedByUserId_fkey" FOREIGN KEY ("observedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_linkedObservationId_fkey" FOREIGN KEY ("linkedObservationId") REFERENCES "SafetyObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_correctiveActionVerifiedByUserId_fkey" FOREIGN KEY ("correctiveActionVerifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_affectsScheduleActivityId_fkey" FOREIGN KEY ("affectsScheduleActivityId") REFERENCES "ScheduleActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTestRecord" ADD CONSTRAINT "InspectionTestRecord_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTestRecord" ADD CONSTRAINT "InspectionTestRecord_inspectedByUserId_fkey" FOREIGN KEY ("inspectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_linkedItrId_fkey" FOREIGN KEY ("linkedItrId") REFERENCES "InspectionTestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborAttendance" ADD CONSTRAINT "LaborAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborAssignment" ADD CONSTRAINT "LaborAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborAssignment" ADD CONSTRAINT "LaborAssignment_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentUsageLog" ADD CONSTRAINT "EquipmentUsageLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentUsageLog" ADD CONSTRAINT "EquipmentUsageLog_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentUsageLog" ADD CONSTRAINT "EquipmentUsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialDemand" ADD CONSTRAINT "MaterialDemand_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialDemand" ADD CONSTRAINT "MaterialDemand_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyLog" ADD CONSTRAINT "CustodyLog_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyLog" ADD CONSTRAINT "CustodyLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyLog" ADD CONSTRAINT "CustodyLog_transferredByUserId_fkey" FOREIGN KEY ("transferredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyLog" ADD CONSTRAINT "CustodyLog_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructuralElement" ADD CONSTRAINT "StructuralElement_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructuralElement" ADD CONSTRAINT "StructuralElement_templateElementId_fkey" FOREIGN KEY ("templateElementId") REFERENCES "StructuralElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarLine" ADD CONSTRAINT "RebarLine_structuralElementId_fkey" FOREIGN KEY ("structuralElementId") REFERENCES "StructuralElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarLine" ADD CONSTRAINT "RebarLine_diameterMm_fkey" FOREIGN KEY ("diameterMm") REFERENCES "WeightFactor"("diameterMm") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormworkLine" ADD CONSTRAINT "FormworkLine_structuralElementId_fkey" FOREIGN KEY ("structuralElementId") REFERENCES "StructuralElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementProgress" ADD CONSTRAINT "ElementProgress_structuralElementId_fkey" FOREIGN KEY ("structuralElementId") REFERENCES "StructuralElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryReport" ADD CONSTRAINT "RegulatoryReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
