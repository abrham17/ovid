/*
  Warnings:

  - The values [INSPECTOR] on the enum `AssignmentRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AssignmentRole_new" AS ENUM ('SITE_ENGINEER', 'FOREMAN');
ALTER TABLE "ActivityAssignment" ALTER COLUMN "role" TYPE "AssignmentRole_new" USING ("role"::text::"AssignmentRole_new");
ALTER TYPE "AssignmentRole" RENAME TO "AssignmentRole_old";
ALTER TYPE "AssignmentRole_new" RENAME TO "AssignmentRole";
DROP TYPE "public"."AssignmentRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActivityAssignment" DROP CONSTRAINT "ActivityAssignment_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "ActivityAssignment" DROP CONSTRAINT "ActivityAssignment_scheduleActivityId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityAssignment" DROP CONSTRAINT "ActivityAssignment_supersededById_fkey";

-- DropForeignKey
ALTER TABLE "ActivityAssignment" DROP CONSTRAINT "ActivityAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_defectLogId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_disputedById_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_itrId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_projectId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "DisputeRecord" DROP CONSTRAINT "DisputeRecord_wbsNodeId_fkey";

-- DropForeignKey
ALTER TABLE "PendingDependencyRequest" DROP CONSTRAINT "PendingDependencyRequest_predecessorId_fkey";

-- DropForeignKey
ALTER TABLE "PendingDependencyRequest" DROP CONSTRAINT "PendingDependencyRequest_projectId_fkey";

-- DropForeignKey
ALTER TABLE "PendingDependencyRequest" DROP CONSTRAINT "PendingDependencyRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "PendingDependencyRequest" DROP CONSTRAINT "PendingDependencyRequest_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "PendingDependencyRequest" DROP CONSTRAINT "PendingDependencyRequest_successorId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewComment" DROP CONSTRAINT "ReviewComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewComment" DROP CONSTRAINT "ReviewComment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewComment" DROP CONSTRAINT "ReviewComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleChangeRequest" DROP CONSTRAINT "SCR_activityId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleChangeRequest" DROP CONSTRAINT "SCR_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleChangeRequest" DROP CONSTRAINT "SCR_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "ScheduleChangeRequest" DROP CONSTRAINT "SCR_reviewedById_fkey";

-- DropIndex
DROP INDEX "Contract_supersedesContractId_idx";

-- DropIndex
DROP INDEX "ProjectDocument_wbs_status_idx";

-- DropIndex
DROP INDEX "ScheduleActivity_overdue_idx";

-- DropIndex
DROP INDEX "WBSNode_planned_dates_idx";

-- CreateIndex
CREATE INDEX "Contract_contractorOrgId_idx" ON "Contract"("contractorOrgId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_scopeWbsNodeId_fkey" FOREIGN KEY ("scopeWbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_supersedesContractId_fkey" FOREIGN KEY ("supersedesContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_scheduleActivityId_fkey" FOREIGN KEY ("scheduleActivityId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ActivityAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ScheduleActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingDependencyRequest" ADD CONSTRAINT "PendingDependencyRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_defectLogId_fkey" FOREIGN KEY ("defectLogId") REFERENCES "DefectLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_itrId_fkey" FOREIGN KEY ("itrId") REFERENCES "InspectionTestRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_disputedById_fkey" FOREIGN KEY ("disputedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeRecord" ADD CONSTRAINT "DisputeRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ReviewComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ScheduleActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ReviewComment_entity_idx" RENAME TO "ReviewComment_entityType_entityId_createdAt_idx";

-- RenameIndex
ALTER INDEX "ReviewComment_parent_idx" RENAME TO "ReviewComment_parentId_idx";

-- RenameIndex
ALTER INDEX "ReviewComment_project_idx" RENAME TO "ReviewComment_projectId_entityType_idx";

-- RenameIndex
ALTER INDEX "ReviewComment_user_idx" RENAME TO "ReviewComment_userId_idx";

-- RenameIndex
ALTER INDEX "SCR_activity_idx" RENAME TO "ScheduleChangeRequest_activityId_idx";

-- RenameIndex
ALTER INDEX "SCR_project_status_idx" RENAME TO "ScheduleChangeRequest_projectId_status_idx";

-- RenameIndex
ALTER INDEX "SCR_requester_idx" RENAME TO "ScheduleChangeRequest_requestedById_idx";
