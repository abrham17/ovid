-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_reworkCostActualId_fkey" FOREIGN KEY ("reworkCostActualId") REFERENCES "CostActual"("id") ON DELETE SET NULL ON UPDATE CASCADE;
