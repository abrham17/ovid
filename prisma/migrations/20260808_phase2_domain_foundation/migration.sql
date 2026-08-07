-- Phase 2: Domain Foundation
-- Adds SUBCONTRACTOR_PM role, WBS planned dates and status fields.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUBCONTRACTOR_PM';
ALTER TABLE "WBSNode" ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(3);
ALTER TABLE "WBSNode" ADD COLUMN IF NOT EXISTS "plannedEndDate" TIMESTAMP(3);
ALTER TABLE "WBSNode" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "WBSNode_planned_dates_idx" ON "WBSNode" ("projectId", "plannedStartDate", "plannedEndDate");
