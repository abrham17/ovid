ALTER TABLE "RebarDailyEntry"
ADD COLUMN "computedWeightKg" DECIMAL(18,3);

ALTER TABLE "RebarLine"
ADD COLUMN "computedWeightKg" DECIMAL(18,3);

ALTER TABLE "FormworkLine"
ADD COLUMN "computedAreaM2" DECIMAL(18,3);
