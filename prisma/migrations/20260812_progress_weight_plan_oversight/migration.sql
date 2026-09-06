-- File 20: weighted progress rollup, subcontractor plan approval,
-- contractor-side oversight, and oversight-gated resource requests.

-- ------------------------------------------------------------------
-- 1. Explicit, PM-assigned completion weight (replaces BoQ-derived weight)
-- ------------------------------------------------------------------
ALTER TABLE "WBSNode" ADD COLUMN "weightPercent" DECIMAL(7,4);
ALTER TABLE "ScheduleActivity" ADD COLUMN "weightPercent" DECIMAL(7,4);

-- ------------------------------------------------------------------
-- 2. WBSNode.status String -> WbsNodeStatus enum (DRAFT gate for plans)
-- ------------------------------------------------------------------
CREATE TYPE "WbsNodeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

ALTER TABLE "WBSNode" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WBSNode" ALTER COLUMN "status" TYPE "WbsNodeStatus" USING (
    CASE upper("status")
        WHEN 'DRAFT' THEN 'DRAFT'
        WHEN 'ARCHIVED' THEN 'ARCHIVED'
        ELSE 'ACTIVE'
    END
)::"WbsNodeStatus";
ALTER TABLE "WBSNode" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "WBSNode" ADD COLUMN "planSubmissionId" TEXT;

CREATE INDEX "WBSNode_projectId_status_idx" ON "WBSNode"("projectId", "status");
CREATE INDEX "WBSNode_planSubmissionId_idx" ON "WBSNode"("planSubmissionId");

-- ------------------------------------------------------------------
-- 3. WbsPlanSubmission — a subcontractor's whole decomposition as one unit
-- ------------------------------------------------------------------
CREATE TYPE "WbsPlanSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

CREATE TABLE "WbsPlanSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "rootWbsNodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WbsPlanSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewComments" TEXT,
    "validationSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbsPlanSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WbsPlanSubmission_projectId_status_idx" ON "WbsPlanSubmission"("projectId", "status");
CREATE INDEX "WbsPlanSubmission_contractId_status_idx" ON "WbsPlanSubmission"("contractId", "status");
CREATE INDEX "WbsPlanSubmission_rootWbsNodeId_idx" ON "WbsPlanSubmission"("rootWbsNodeId");
CREATE INDEX "WbsPlanSubmission_createdById_idx" ON "WbsPlanSubmission"("createdById");

ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_rootWbsNodeId_fkey" FOREIGN KEY ("rootWbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WbsPlanSubmission" ADD CONSTRAINT "WbsPlanSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WBSNode" ADD CONSTRAINT "WBSNode_planSubmissionId_fkey" FOREIGN KEY ("planSubmissionId") REFERENCES "WbsPlanSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- 4. OversightAssignment — verification authority, not execution ownership
-- ------------------------------------------------------------------
CREATE TABLE "OversightAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "scopeWbsNodeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "supersededById" TEXT,

    CONSTRAINT "OversightAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OversightAssignment_userId_endedAt_idx" ON "OversightAssignment"("userId", "endedAt");
CREATE INDEX "OversightAssignment_projectId_contractId_endedAt_idx" ON "OversightAssignment"("projectId", "contractId", "endedAt");
CREATE INDEX "OversightAssignment_contractId_endedAt_idx" ON "OversightAssignment"("contractId", "endedAt");
CREATE INDEX "OversightAssignment_scopeWbsNodeId_idx" ON "OversightAssignment"("scopeWbsNodeId");

ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_scopeWbsNodeId_fkey" FOREIGN KEY ("scopeWbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightAssignment" ADD CONSTRAINT "OversightAssignment_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "OversightAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- 5. OversightDailyEntry — the contractor's own parallel daily record
-- ------------------------------------------------------------------
CREATE TYPE "OversightAssessment" AS ENUM ('NOT_ASSESSED', 'MATCHES_REPORTED', 'BELOW_REPORTED', 'ABOVE_REPORTED');

CREATE TABLE "OversightDailyEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "oversightAssignmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activityDescription" TEXT NOT NULL,
    "observedQuantity" DECIMAL(12,3),
    "observedUnit" TEXT,
    "reportedQuantity" DECIMAL(12,3),
    "quantityAssessment" "OversightAssessment" NOT NULL DEFAULT 'NOT_ASSESSED',
    "qualityAssessment" TEXT,
    "concernsRaised" TEXT,
    "manpowerObserved" INTEGER,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OversightDailyEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OversightDailyEntry_projectId_date_idx" ON "OversightDailyEntry"("projectId", "date");
CREATE INDEX "OversightDailyEntry_contractId_date_idx" ON "OversightDailyEntry"("contractId", "date");
CREATE INDEX "OversightDailyEntry_wbsNodeId_idx" ON "OversightDailyEntry"("wbsNodeId");
CREATE INDEX "OversightDailyEntry_oversightAssignmentId_idx" ON "OversightDailyEntry"("oversightAssignmentId");
CREATE INDEX "OversightDailyEntry_status_idx" ON "OversightDailyEntry"("status");

ALTER TABLE "OversightDailyEntry" ADD CONSTRAINT "OversightDailyEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightDailyEntry" ADD CONSTRAINT "OversightDailyEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightDailyEntry" ADD CONSTRAINT "OversightDailyEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightDailyEntry" ADD CONSTRAINT "OversightDailyEntry_oversightAssignmentId_fkey" FOREIGN KEY ("oversightAssignmentId") REFERENCES "OversightAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OversightDailyEntry" ADD CONSTRAINT "OversightDailyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- 6. ResourceRequest — subcontractor ask, gated by the oversight holder
-- ------------------------------------------------------------------
CREATE TYPE "ResourceRequestKind" AS ENUM ('MATERIAL', 'EQUIPMENT', 'LABOR');
CREATE TYPE "ResourceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED');

ALTER TABLE "MaterialDemand" ADD COLUMN "requestedForContractId" TEXT;
CREATE INDEX "MaterialDemand_requestedForContractId_idx" ON "MaterialDemand"("requestedForContractId");
ALTER TABLE "MaterialDemand" ADD CONSTRAINT "MaterialDemand_requestedForContractId_fkey" FOREIGN KEY ("requestedForContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ResourceRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "kind" "ResourceRequestKind" NOT NULL,
    "materialItemId" TEXT,
    "equipmentId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT,
    "neededByDate" DATE NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "ResourceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "materialDemandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceRequest_materialDemandId_key" ON "ResourceRequest"("materialDemandId");
CREATE INDEX "ResourceRequest_projectId_status_idx" ON "ResourceRequest"("projectId", "status");
CREATE INDEX "ResourceRequest_contractId_status_idx" ON "ResourceRequest"("contractId", "status");
CREATE INDEX "ResourceRequest_wbsNodeId_idx" ON "ResourceRequest"("wbsNodeId");
CREATE INDEX "ResourceRequest_requestedById_idx" ON "ResourceRequest"("requestedById");
CREATE INDEX "ResourceRequest_neededByDate_idx" ON "ResourceRequest"("neededByDate");

ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_materialDemandId_fkey" FOREIGN KEY ("materialDemandId") REFERENCES "MaterialDemand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- 7. New notification types for the handoffs in this chain
-- ------------------------------------------------------------------
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WBS_PLAN_PENDING_REVIEW';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WBS_PLAN_REVIEWED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OVERSIGHT_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'OVERSIGHT_VARIANCE_FLAGGED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESOURCE_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESOURCE_REQUEST_REVIEWED';
