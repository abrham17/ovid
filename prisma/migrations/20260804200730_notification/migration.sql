/*
  Warnings:

  - The values [LOCAL_STANDARD] on the enum `ContractType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DAILY_REPORT_PENDING_SIGNOFF', 'SAFETY_INCIDENT_OPEN', 'RISK_UNASSIGNED', 'MEASUREMENT_PENDING_CERTIFICATION', 'VARIATION_PENDING_APPROVAL', 'DOCUMENT_PENDING_APPROVAL', 'PO_PENDING_APPROVAL', 'CUSTODY_PENDING_ACKNOWLEDGEMENT', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "ContractType_new" AS ENUM ('FIDIC_RED', 'FIDIC_YELLOW', 'ETHIO_STANDARD', 'OTHER');
ALTER TABLE "Project" ALTER COLUMN "contractType" TYPE "ContractType_new" USING ("contractType"::text::"ContractType_new");
ALTER TYPE "ContractType" RENAME TO "ContractType_old";
ALTER TYPE "ContractType_new" RENAME TO "ContractType";
DROP TYPE "public"."ContractType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ProjectType" ADD VALUE 'GREEN_PARK';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_projectId_idx" ON "Notification"("projectId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
