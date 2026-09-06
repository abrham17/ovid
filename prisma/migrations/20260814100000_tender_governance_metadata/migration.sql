ALTER TABLE "BidTender"
  ADD COLUMN "tenderOwnerId" TEXT,
  ADD COLUMN "awardedAt" TIMESTAMP(3),
  ADD COLUMN "conversionProposedAt" TIMESTAMP(3),
  ADD COLUMN "convertedAt" TIMESTAMP(3);

CREATE INDEX "BidTender_tenderOwnerId_idx" ON "BidTender"("tenderOwnerId");

ALTER TABLE "BidTender"
  ADD CONSTRAINT "BidTender_tenderOwnerId_fkey"
  FOREIGN KEY ("tenderOwnerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
