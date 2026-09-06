-- SectionAssignment: Superintendent / Site Engineer ownership of a WBS subtree
CREATE TYPE "SectionAssignmentRole" AS ENUM ('SITE_ENGINEER_OWNER', 'SUPERINTENDENT_OWNER');

CREATE TABLE "SectionAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "role" "SectionAssignmentRole" NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "supersededById" TEXT,

    CONSTRAINT "SectionAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SectionAssignment_userId_endedAt_idx" ON "SectionAssignment"("userId", "endedAt");
CREATE INDEX "SectionAssignment_projectId_wbsNodeId_idx" ON "SectionAssignment"("projectId", "wbsNodeId");
CREATE INDEX "SectionAssignment_wbsNodeId_idx" ON "SectionAssignment"("wbsNodeId");
CREATE INDEX "SectionAssignment_userId_role_endedAt_idx" ON "SectionAssignment"("userId", "role", "endedAt");

ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SectionAssignment" ADD CONSTRAINT "SectionAssignment_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "SectionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
