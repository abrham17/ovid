ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OFFICE_ENGINEER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMPANY_STAFF';

CREATE TYPE "CompanyStaffRole" AS ENUM ('GENERAL_MANAGER','LEGAL_SERVICE_MANAGER','HEAD_TENDERING','TENDERING_OFFICER','HEAD_PLANNING_MONITORING','PLANNING_OFFICER','ENGINEERING_DEPT_MANAGER','HEAD_ENGINEERING_SERVICES','ENGINEERING_SERVICES_OFFICER','EQUIPMENT_ADMIN_MANAGER','FINANCE_DEPT_MANAGER','INTERNAL_AUDITOR');
CREATE TYPE "CompanyApprovalType" AS ENUM ('PROJECT_CREATION','CONTRACTOR_ONBOARDING','CONTRACT_TEMPLATE','HIGH_VALUE_CONTRACT','HIGH_VALUE_VARIATION','DESIGN_STANDARD','EQUIPMENT_CAPITAL','IPC_PAYMENT');
CREATE TYPE "CompanyApprovalStatus" AS ENUM ('PENDING','APPROVED','REJECTED');

ALTER TABLE "BidTender" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "BidTender" ADD COLUMN "ownerOrgId" TEXT;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "BidTender_ownerOrgId_bidNo_key" ON "BidTender"("ownerOrgId","bidNo");

CREATE TABLE "CompanyStaffAssignment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "CompanyStaffRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "assignedById" TEXT,
  "reason" TEXT
);
CREATE INDEX "CompanyStaffAssignment_userId_organizationId_role_active_idx" ON "CompanyStaffAssignment"("userId","organizationId","role","active");
CREATE INDEX "CompanyStaffAssignment_organizationId_active_idx" ON "CompanyStaffAssignment"("organizationId","active");
CREATE INDEX "CompanyStaffAssignment_userId_active_idx" ON "CompanyStaffAssignment"("userId","active");

CREATE TABLE "CompanyInvitation" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "role" "CompanyStaffRole" NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CompanyInvitation_tokenHash_key" ON "CompanyInvitation"("tokenHash");
CREATE INDEX "CompanyInvitation_organizationId_status_idx" ON "CompanyInvitation"("organizationId","status");
CREATE INDEX "CompanyInvitation_email_idx" ON "CompanyInvitation"("email");

CREATE TABLE "CompanyApproval" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "type" "CompanyApprovalType" NOT NULL,
  "status" "CompanyApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "amount" DECIMAL(18,2),
  "thresholdSnapshot" JSONB,
  "comment" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3)
);
CREATE INDEX "CompanyApproval_organizationId_status_idx" ON "CompanyApproval"("organizationId","status");
CREATE INDEX "CompanyApproval_entityType_entityId_idx" ON "CompanyApproval"("entityType","entityId");

ALTER TABLE "BidTender" ADD CONSTRAINT "BidTender_ownerOrgId_fkey" FOREIGN KEY ("ownerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyStaffAssignment" ADD CONSTRAINT "CompanyStaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyStaffAssignment" ADD CONSTRAINT "CompanyStaffAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyStaffAssignment" ADD CONSTRAINT "CompanyStaffAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyInvitation" ADD CONSTRAINT "CompanyInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyApproval" ADD CONSTRAINT "CompanyApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyApproval" ADD CONSTRAINT "CompanyApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyApproval" ADD CONSTRAINT "CompanyApproval_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
