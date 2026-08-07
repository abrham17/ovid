-- Chain of custody features: Contract lifecycle, Activity Assignment, Dependency Requests, Disputes
-- See prisma/schema.prisma for full model definitions.

-- New enums
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'COMPLETED');
CREATE TYPE "AssignmentRole" AS ENUM ('SITE_ENGINEER', 'FOREMAN', 'INSPECTOR');
CREATE TYPE "DependencyRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');

-- Alter NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACTIVITY_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEPENDENCY_REQUEST_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTRACT_STATUS_CHANGED';

-- Extend Contract
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "scopeWbsNodeId" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "supersedesContractId" TEXT;
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "terminatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Contract_scopeWbsNodeId_idx" ON "Contract"("scopeWbsNodeId");
CREATE INDEX IF NOT EXISTS "Contract_supersedesContractId_idx" ON "Contract"("supersedesContractId");
CREATE INDEX IF NOT EXISTS "Contract_status_idx" ON "Contract"("status");

-- ActivityAssignment
CREATE TABLE "ActivityAssignment" (
    "id" TEXT NOT NULL,
    "scheduleActivityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "supersededById" TEXT,

    CONSTRAINT "ActivityAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityAssignment_scheduleActivityId_idx" ON "ActivityAssignment"("scheduleActivityId");
CREATE INDEX IF NOT EXISTS "ActivityAssignment_userId_idx" ON "ActivityAssignment"("userId");
CREATE INDEX IF NOT EXISTS "ActivityAssignment_role_idx" ON "ActivityAssignment"("role");
CREATE INDEX IF NOT EXISTS "ActivityAssignment_userId_role_endedAt_idx" ON "ActivityAssignment"("userId", "role", "endedAt");

ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_scheduleActivityId_fkey" FOREIGN KEY ("scheduleActivityId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE;
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ActivityAssignment"("id") ON DELETE SET NULL;

-- PendingDependencyRequest
CREATE TABLE "PendingDependencyRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "justification" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "status" "DependencyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PendingDependencyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PendingDependencyRequest_projectId_status_idx" ON "PendingDependencyRequest"("projectId", "status");
CREATE INDEX IF NOT EXISTS "PendingDependencyRequest_requestedById_idx" ON "PendingDependencyRequest"("requestedById");
CREATE INDEX IF NOT EXISTS "PendingDependencyRequest_reviewedById_idx" ON "PendingDependencyRequest"("reviewedById");

ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleActivity"("id") ON DELETE RESTRICT;
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ScheduleActivity"("id") ON DELETE RESTRICT;
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- DisputeRecord
CREATE TABLE "DisputeRecord" (
    "id" TEXT NOT NULL,
    "defectLogId" TEXT,
    "itrId" TEXT,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "disputedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "escalationTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisputeRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DisputeRecord_projectId_idx" ON "DisputeRecord"("projectId");
CREATE INDEX IF NOT EXISTS "DisputeRecord_defectLogId_idx" ON "DisputeRecord"("defectLogId");
CREATE INDEX IF NOT EXISTS "DisputeRecord_status_idx" ON "DisputeRecord"("status");

ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_defectLogId_fkey" FOREIGN KEY ("defectLogId") REFERENCES "DefectLog"("id") ON DELETE SET NULL;
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_itrId_fkey" FOREIGN KEY ("itrId") REFERENCES "InspectionTestRecord"("id") ON DELETE SET NULL;
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL;
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_disputedById_fkey" FOREIGN KEY ("disputedById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL;