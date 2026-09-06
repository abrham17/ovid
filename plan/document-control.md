# Document control — analysis and plan

ISO refs
- ISO 9001 §7.5 document control

Current behavior
- DocumentTemplate and ProjectDocument model exist with revision chains and statuses.

Gaps
1. No explicit document access control tied to project roles beyond general RBAC.
2. Attachments and document storage policies not specified (versioning and retention incomplete).
3. No automatic indexing of documents to affected WBS nodes and activities for traceability.

Required changes
- Ensure ProjectDocument model includes fields: version, uploadedBy, storageRef, changeSummary, revokedAt
- Implement document access control checks in document APIs (read/write based on route-permission manifest)
- Implement document-to-WBS linking and indexing to provide traceability
- Add retention & archival policies and purge job

Files
- prisma/schema.prisma: extend ProjectDocument with versioning metadata
- src/app/api/projects/:id/documents routes: enforce validation and sign-off workflows
- docs/ops/document-retention.md

Verification
- Document history persists; version reverts possible; access restricted per permissions

Priority
- Versioning & access control: medium-high

