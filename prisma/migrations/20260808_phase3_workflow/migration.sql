-- Phase 3: Review/Comment + Schedule Change Requests
-- Creates ReviewComment, ScheduleChangeRequest tables + notification types

-- ScheduleChangeRequest.status uses this enum. It must be created before the
-- table so the migration can also be replayed from scratch in Prisma's shadow
-- database.
CREATE TYPE "ScheduleChangeStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE IF NOT EXISTS "ReviewComment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "body" TEXT NOT NULL,
  "isDecision" BOOLEAN NOT NULL DEFAULT false,
  "decisionLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReviewComment"
  ADD CONSTRAINT "ReviewComment_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE RESTRICT;

ALTER TABLE "ReviewComment"
  ADD CONSTRAINT "ReviewComment_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

ALTER TABLE "ReviewComment"
  ADD CONSTRAINT "ReviewComment_parentId_fkey"
  FOREIGN KEY ("parentId")
  REFERENCES "ReviewComment"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "ReviewComment_entity_idx"
  ON "ReviewComment" ("entityType", "entityId", "createdAt");

CREATE INDEX IF NOT EXISTS "ReviewComment_project_idx"
  ON "ReviewComment" ("projectId", "entityType");

CREATE INDEX IF NOT EXISTS "ReviewComment_user_idx"
  ON "ReviewComment" ("userId");

CREATE INDEX IF NOT EXISTS "ReviewComment_parent_idx"
  ON "ReviewComment" ("parentId");


ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'REVIEW_COMMENT_ADDED';

ALTER TYPE "NotificationType"
  ADD VALUE IF NOT EXISTS 'SCHEDULE_CHANGE_PENDING';


CREATE TABLE IF NOT EXISTS "ScheduleChangeRequest" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "newStart" TIMESTAMP(3) NOT NULL,
  "newFinish" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ScheduleChangeStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "SCR_activityId_fkey"
  FOREIGN KEY ("activityId")
  REFERENCES "ScheduleActivity"("id")
  ON DELETE CASCADE;

ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "SCR_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "Project"("id")
  ON DELETE CASCADE;

ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "SCR_requestedById_fkey"
  FOREIGN KEY ("requestedById")
  REFERENCES "User"("id")
  ON DELETE RESTRICT;

ALTER TABLE "ScheduleChangeRequest"
  ADD CONSTRAINT "SCR_reviewedById_fkey"
  FOREIGN KEY ("reviewedById")
  REFERENCES "User"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "SCR_project_status_idx"
  ON "ScheduleChangeRequest" ("projectId", "status");

CREATE INDEX IF NOT EXISTS "SCR_activity_idx"
  ON "ScheduleChangeRequest" ("activityId");

CREATE INDEX IF NOT EXISTS "SCR_requester_idx"
  ON "ScheduleChangeRequest" ("requestedById");
