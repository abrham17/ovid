ALTER TYPE "CompanyApprovalType" ADD VALUE IF NOT EXISTS 'EXECUTIVE_CONTRACT';
ALTER TYPE "CompanyApprovalType" ADD VALUE IF NOT EXISTS 'EXECUTIVE_VARIATION';

CREATE TYPE "ExecutiveInterventionCategory" AS ENUM (
  'SCHEDULE', 'COST', 'SAFETY', 'COMPLIANCE', 'AUDIT', 'CONTRACT', 'RESOURCE', 'OTHER'
);

CREATE TYPE "ExecutiveInterventionPriority" AS ENUM ('MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "ExecutiveInterventionStatus" AS ENUM (
  'OPEN', 'ACKNOWLEDGED', 'ACTION_IN_PROGRESS', 'READY_FOR_REVIEW', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "ExecutiveInterventionEventType" AS ENUM (
  'CREATED', 'MANAGEMENT_RESPONSE', 'CEO_DIRECTION', 'STATUS_CHANGE', 'DUE_DATE_CHANGE'
);

CREATE TABLE "ExecutiveIntervention" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "category" "ExecutiveInterventionCategory" NOT NULL,
  "priority" "ExecutiveInterventionPriority" NOT NULL DEFAULT 'HIGH',
  "status" "ExecutiveInterventionStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "requiredAction" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "accountableUserId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "closedById" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExecutiveIntervention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExecutiveInterventionEvent" (
  "id" TEXT NOT NULL,
  "interventionId" TEXT NOT NULL,
  "type" "ExecutiveInterventionEventType" NOT NULL,
  "authorId" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "oldStatus" "ExecutiveInterventionStatus",
  "newStatus" "ExecutiveInterventionStatus",
  "oldDueAt" TIMESTAMP(3),
  "newDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExecutiveInterventionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutiveIntervention_organizationId_status_idx" ON "ExecutiveIntervention"("organizationId", "status");
CREATE INDEX "ExecutiveIntervention_projectId_status_idx" ON "ExecutiveIntervention"("projectId", "status");
CREATE INDEX "ExecutiveIntervention_accountableUserId_status_idx" ON "ExecutiveIntervention"("accountableUserId", "status");
CREATE INDEX "ExecutiveIntervention_dueAt_status_idx" ON "ExecutiveIntervention"("dueAt", "status");
CREATE INDEX "ExecutiveInterventionEvent_interventionId_createdAt_idx" ON "ExecutiveInterventionEvent"("interventionId", "createdAt");
CREATE INDEX "ExecutiveInterventionEvent_authorId_createdAt_idx" ON "ExecutiveInterventionEvent"("authorId", "createdAt");

ALTER TABLE "ExecutiveIntervention" ADD CONSTRAINT "ExecutiveIntervention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutiveIntervention" ADD CONSTRAINT "ExecutiveIntervention_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutiveIntervention" ADD CONSTRAINT "ExecutiveIntervention_accountableUserId_fkey" FOREIGN KEY ("accountableUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExecutiveIntervention" ADD CONSTRAINT "ExecutiveIntervention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExecutiveIntervention" ADD CONSTRAINT "ExecutiveIntervention_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExecutiveInterventionEvent" ADD CONSTRAINT "ExecutiveInterventionEvent_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "ExecutiveIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutiveInterventionEvent" ADD CONSTRAINT "ExecutiveInterventionEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
