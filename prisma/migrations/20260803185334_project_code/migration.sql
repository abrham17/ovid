-- Add required unique `code` column to Project, backfilling existing rows.
ALTER TABLE "Project" ADD COLUMN "code" TEXT;

UPDATE "Project" SET "code" = 'LEG-' || "id";

ALTER TABLE "Project" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
