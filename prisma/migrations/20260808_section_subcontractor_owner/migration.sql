-- Allow WBS section ownership to be assigned to Subcontractor PMs
ALTER TYPE "SectionAssignmentRole" ADD VALUE IF NOT EXISTS 'SUBCONTRACTOR_OWNER';
