-- Enforce one active assignment per user, organization and company role while
-- retaining inactive historical assignment rows.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "userId", "organizationId", "role"
    ORDER BY "assignedAt" DESC, "id" DESC
  ) AS position
  FROM "CompanyStaffAssignment"
  WHERE "active" = true
)
UPDATE "CompanyStaffAssignment" assignment
SET "active" = false,
    "endedAt" = COALESCE(assignment."endedAt", CURRENT_TIMESTAMP),
    "reason" = COALESCE(assignment."reason", 'Deactivated while enforcing active assignment uniqueness')
FROM ranked
WHERE assignment."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "CompanyStaffAssignment_active_role_key"
ON "CompanyStaffAssignment" ("userId", "organizationId", "role")
WHERE "active" = true;

CREATE TYPE "DesignReviewStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUIRED',
  'APPROVED',
  'CLOSED'
);

CREATE TYPE "AuditFindingStatus" AS ENUM (
  'OPEN',
  'REMEDIATION_IN_PROGRESS',
  'READY_FOR_VERIFICATION',
  'CLOSED'
);

CREATE TABLE "DesignReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "wbsNodeId" TEXT,
  "title" TEXT NOT NULL,
  "documentRef" TEXT NOT NULL,
  "reviewType" TEXT NOT NULL,
  "safetyCritical" BOOLEAN NOT NULL DEFAULT false,
  "status" "DesignReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "findings" JSONB,
  "resolution" TEXT,
  "submittedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditFinding" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" "AuditFindingStatus" NOT NULL DEFAULT 'OPEN',
  "evidenceRef" TEXT,
  "remediationPlan" TEXT,
  "managementReply" TEXT,
  "dueAt" TIMESTAMP(3),
  "raisedById" TEXT NOT NULL,
  "ownerId" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EquipmentAllocation" (
  "id" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "allocatedFrom" DATE NOT NULL,
  "allocatedTo" DATE NOT NULL,
  "purpose" TEXT NOT NULL,
  "allocatedById" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesignReview_organizationId_status_idx" ON "DesignReview"("organizationId", "status");
CREATE INDEX "DesignReview_projectId_status_idx" ON "DesignReview"("projectId", "status");
CREATE INDEX "AuditFinding_organizationId_status_idx" ON "AuditFinding"("organizationId", "status");
CREATE INDEX "AuditFinding_projectId_status_idx" ON "AuditFinding"("projectId", "status");
CREATE INDEX "AuditFinding_dueAt_idx" ON "AuditFinding"("dueAt");
CREATE INDEX "EquipmentAllocation_equipmentId_allocatedFrom_allocatedTo_idx" ON "EquipmentAllocation"("equipmentId", "allocatedFrom", "allocatedTo");
CREATE INDEX "EquipmentAllocation_projectId_allocatedFrom_allocatedTo_idx" ON "EquipmentAllocation"("projectId", "allocatedFrom", "allocatedTo");

ALTER TABLE "DesignReview" ADD CONSTRAINT "DesignReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignReview" ADD CONSTRAINT "DesignReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignReview" ADD CONSTRAINT "DesignReview_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignReview" ADD CONSTRAINT "DesignReview_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DesignReview" ADD CONSTRAINT "DesignReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EquipmentAllocation" ADD CONSTRAINT "EquipmentAllocation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentAllocation" ADD CONSTRAINT "EquipmentAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentAllocation" ADD CONSTRAINT "EquipmentAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
