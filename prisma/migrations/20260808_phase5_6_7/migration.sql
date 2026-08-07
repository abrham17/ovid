-- Phase 5-7: Quality status, Dashboard metrics, Document scope
-- Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS "ScheduleActivity_overdue_idx" ON "ScheduleActivity" ("wbsNodeId", "plannedFinish", "status");
CREATE INDEX IF NOT EXISTS "InspectionTestRecord_wbs_idx" ON "InspectionTestRecord" ("wbsNodeId");
CREATE INDEX IF NOT EXISTS "ProjectDocument_wbs_status_idx" ON "ProjectDocument" ("wbsNodeId", "status");
