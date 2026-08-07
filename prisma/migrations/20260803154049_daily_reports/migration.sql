-- CreateEnum
CREATE TYPE "DailyReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateTable
CREATE TABLE "EarthworkDailyEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "station" TEXT,
    "activityDescription" TEXT NOT NULL,
    "equipmentType" TEXT,
    "equipmentPlateNo" TEXT,
    "operatingHours" DECIMAL(6,2),
    "idleHours" DECIMAL(6,2),
    "downHours" DECIMAL(6,2),
    "quantityLength" DECIMAL(12,3),
    "quantityWidth" DECIMAL(12,3),
    "quantityDepth" DECIMAL(12,3),
    "manpower" JSONB,
    "remark" TEXT,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarthworkDailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StructureDailyEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activityDescription" TEXT NOT NULL,
    "designQuantity" DECIMAL(12,3),
    "actualQuantity" DECIMAL(12,3),
    "materialUsed" TEXT,
    "concreteGrade" TEXT,
    "labour" JSONB,
    "equipmentType" TEXT,
    "equipmentSerialNo" TEXT,
    "operatingHours" DECIMAL(6,2),
    "idleHours" DECIMAL(6,2),
    "downHours" DECIMAL(6,2),
    "remark" TEXT,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StructureDailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebarDailyEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "barDesignation" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "numberOfBars" INTEGER NOT NULL,
    "lengthM" DECIMAL(12,3) NOT NULL,
    "numberOfFaces" INTEGER NOT NULL,
    "shape" TEXT,
    "labour" JSONB,
    "remark" TEXT,
    "status" "DailyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RebarDailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarthworkDailyEntry_projectId_date_idx" ON "EarthworkDailyEntry"("projectId", "date");

-- CreateIndex
CREATE INDEX "EarthworkDailyEntry_wbsNodeId_idx" ON "EarthworkDailyEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "EarthworkDailyEntry_status_idx" ON "EarthworkDailyEntry"("status");

-- CreateIndex
CREATE INDEX "StructureDailyEntry_projectId_date_idx" ON "StructureDailyEntry"("projectId", "date");

-- CreateIndex
CREATE INDEX "StructureDailyEntry_wbsNodeId_idx" ON "StructureDailyEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "StructureDailyEntry_status_idx" ON "StructureDailyEntry"("status");

-- CreateIndex
CREATE INDEX "RebarDailyEntry_projectId_date_idx" ON "RebarDailyEntry"("projectId", "date");

-- CreateIndex
CREATE INDEX "RebarDailyEntry_wbsNodeId_idx" ON "RebarDailyEntry"("wbsNodeId");

-- CreateIndex
CREATE INDEX "RebarDailyEntry_status_idx" ON "RebarDailyEntry"("status");

-- AddForeignKey
ALTER TABLE "EarthworkDailyEntry" ADD CONSTRAINT "EarthworkDailyEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarthworkDailyEntry" ADD CONSTRAINT "EarthworkDailyEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarthworkDailyEntry" ADD CONSTRAINT "EarthworkDailyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureDailyEntry" ADD CONSTRAINT "StructureDailyEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureDailyEntry" ADD CONSTRAINT "StructureDailyEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureDailyEntry" ADD CONSTRAINT "StructureDailyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarDailyEntry" ADD CONSTRAINT "RebarDailyEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarDailyEntry" ADD CONSTRAINT "RebarDailyEntry_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarDailyEntry" ADD CONSTRAINT "RebarDailyEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebarDailyEntry" ADD CONSTRAINT "RebarDailyEntry_diameterMm_fkey" FOREIGN KEY ("diameterMm") REFERENCES "WeightFactor"("diameterMm") ON DELETE RESTRICT ON UPDATE CASCADE;
