# Document and Information Management — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 9001:2015 §7.5 (Documented information), ISO 10006:2017 §7.6 (Communication & documentation management), ISO/IEC 27001:2022 A.8.10 (Information deletion & revision retention).
- **Principle**: Project documentation (drawings, specifications, method statements, contracts, correspondence) must be managed under strict version control. Superseded revisions must remain archived for auditability, effective dates must be enforced, and sign-offs must capture digital signature records.

## 2. Where it Applies to Project Management
Applies to project document repository, drawing revision control, technical submittals, method statements, correspondence registers, and formal contract sign-offs.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `DocumentTemplate`, `ProjectDocument` (`revisionNo`, `status: DRAFT | UNDER_REVIEW | ISSUED | SUPERSEDED | WITHDRAWN`, `supersededById`), `SignOff`, and `DecisionLog`.
- `src/lib/services/document.service.ts` manages document upload, revision superseding, review, and sign-off workflows.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model ProjectDocument`, `model DocumentTemplate`, `model SignOff`, `model DecisionLog`)
- `src/lib/services/document.service.ts`
- `src/app/api/projects/[id]/documents/route.ts`

## 5. Compliance Status
**Fully Aligned (Document Control & Revision Model)** / **Partially Compliant (File Attachment Encryption & Access Enforcement)**

## 6. Exact Gap
1. While document metadata and revision chains are maintained, file attachments stored on disk/S3 lack strict server-side access permission checks before serving files via API endpoints.
2. Digital signatures logged in `SignOff` capture `userId` and `signOffRole` but do not embed a cryptographic hash of the signed document revision content.

## 7. Why the Gap Matters
Unrestricted direct access to project document files bypasses RBAC scope security. Unhashed digital signatures leave document sign-offs vulnerable to non-repudiation disputes.

## 8. Required Architectural / Design Change
- Serve project document attachments exclusively through authenticated API stream routes (`GET /api/projects/:id/documents/:docId/download`) that execute `assertProjectAccess()` and `assertScopeRead()`.
- Compute SHA-256 hash of document binary files during upload and record hash in `SignOff.comment` during approval.

## 9. Required Database Change
- Existing `ProjectDocument` and `SignOff` schema models in `prisma/schema.prisma` are fully aligned and support document supersede chains.

## 10. Required Backend / API Change
- Update `uploadDocumentRevision()` in `src/lib/services/document.service.ts`:
  - Calculate file SHA-256 checksum.
  - Automatically set `status = SUPERSEDED` on the prior revision.
  - Link `supersededById` foreign key.

## 11. Required Frontend / UI Change
- Update document library workspace (`src/components/projects/documents-tab.tsx`) to show complete **Revision History Tree** (v1 $\rightarrow$ v2 $\rightarrow$ v3 Current).
- Highlight superseded status warnings on outdated engineering drawings.

## 12. Required Workflow Change
1. Engineering Services Officer uploads new drawing revision (v2).
2. System computes file hash, sets v1 to `SUPERSEDED`, sets v2 to `UNDER_REVIEW`.
3. Resident Engineer approves v2 $\rightarrow$ system sets v2 to `ISSUED`, records `SignOff` entry with checksum hash.

## 13. Dependencies
- Audit logger (`audit.ts`).
- Permission authorization engine (`permissions.ts`).

## 14. Implementation Priority
**High (Phase 6)**

## 15. Acceptance / Verification Criteria
- Direct file download attempts without valid JWT session return HTTP 401 Unauthorized.
- Document revision chain correctly links `v2.supersededById == v1.id` and sets `v1.status = SUPERSEDED`.
