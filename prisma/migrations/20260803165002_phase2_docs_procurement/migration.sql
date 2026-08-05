-- CreateEnum
CREATE TYPE "DocCategory" AS ENUM ('DRAWING', 'SPECIFICATION', 'CONTRACT', 'CORRESPONDENCE', 'PERMIT', 'METHOD_STATEMENT', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ISSUED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('DESIGN_CHANGE', 'DELAY_RULING', 'VARIATION_APPROVAL', 'RESOURCE_ALLOCATION', 'SAFETY_STOPPAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'APPROVED', 'ISSUED', 'PARTIAL_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "docNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocCategory" NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "filePath" TEXT,
    "issuedByUserId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3),
    "approvedById" TEXT,
    "supersededById" TEXT,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "documentId" TEXT,
    "riskId" TEXT,
    "variationId" TEXT,
    "decisionType" "DecisionType" NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "madeByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonsLearned" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "phase" TEXT,
    "category" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "recommendation" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonsLearned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierOrgId" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" TIMESTAMP(3),
    "amount" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "materialDemandId" TEXT,
    "wbsNodeId" TEXT,
    "quantityOrdered" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "quantityReceived" DECIMAL(18,3) NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceipt" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialItemId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "projectId" TEXT NOT NULL,
    "quantityReceived" DECIMAL(18,3) NOT NULL,
    "receiptDate" DATE NOT NULL,
    "receivedByUserId" TEXT NOT NULL,
    "remark" TEXT,

    CONSTRAINT "MaterialReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidTender" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierOrgId" TEXT,
    "bidNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(18,2),
    "submittedAt" TIMESTAMP(3),
    "result" "BidStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BidTender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_wbsNodeId_idx" ON "ProjectDocument"("wbsNodeId");

-- CreateIndex
CREATE INDEX "ProjectDocument_category_idx" ON "ProjectDocument"("category");

-- CreateIndex
CREATE INDEX "ProjectDocument_status_idx" ON "ProjectDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_docNo_revisionNo_key" ON "ProjectDocument"("projectId", "docNo", "revisionNo");

-- CreateIndex
CREATE INDEX "DecisionLog_projectId_idx" ON "DecisionLog"("projectId");

-- CreateIndex
CREATE INDEX "DecisionLog_wbsNodeId_idx" ON "DecisionLog"("wbsNodeId");

-- CreateIndex
CREATE INDEX "DecisionLog_documentId_idx" ON "DecisionLog"("documentId");

-- CreateIndex
CREATE INDEX "DecisionLog_riskId_idx" ON "DecisionLog"("riskId");

-- CreateIndex
CREATE INDEX "DecisionLog_variationId_idx" ON "DecisionLog"("variationId");

-- CreateIndex
CREATE INDEX "LessonsLearned_projectId_idx" ON "LessonsLearned"("projectId");

-- CreateIndex
CREATE INDEX "LessonsLearned_wbsNodeId_idx" ON "LessonsLearned"("wbsNodeId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierOrgId_idx" ON "PurchaseOrder"("supplierOrgId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_projectId_poNo_key" ON "PurchaseOrder"("projectId", "poNo");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_materialDemandId_idx" ON "PurchaseOrderItem"("materialDemandId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_materialItemId_idx" ON "PurchaseOrderItem"("materialItemId");

-- CreateIndex
CREATE INDEX "MaterialReceipt_purchaseOrderId_idx" ON "MaterialReceipt"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "MaterialReceipt_materialItemId_idx" ON "MaterialReceipt"("materialItemId");

-- CreateIndex
CREATE INDEX "MaterialReceipt_receiptDate_idx" ON "MaterialReceipt"("receiptDate");

-- CreateIndex
CREATE INDEX "BidTender_result_idx" ON "BidTender"("result");

-- CreateIndex
CREATE INDEX "BidTender_supplierOrgId_idx" ON "BidTender"("supplierOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "BidTender_projectId_bidNo_key" ON "BidTender"("projectId", "bidNo");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "RiskEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "VariationOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionLog" ADD CONSTRAINT "DecisionLog_madeByUserId_fkey" FOREIGN KEY ("madeByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonsLearned" ADD CONSTRAINT "LessonsLearned_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonsLearned" ADD CONSTRAINT "LessonsLearned_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonsLearned" ADD CONSTRAINT "LessonsLearned_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialDemandId_fkey" FOREIGN KEY ("materialDemandId") REFERENCES "MaterialDemand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WBSNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidTender" ADD CONSTRAINT "BidTender_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidTender" ADD CONSTRAINT "BidTender_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidTender" ADD CONSTRAINT "BidTender_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
