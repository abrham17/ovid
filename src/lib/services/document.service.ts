import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { assertStatusTransition, DOC_TRANSITIONS } from "@/lib/domain-rules";
import type { CreateDocumentInput } from "@/lib/validations/document";

/**
 * Phase 3 — Document control (ISO 9001 §7.5 style).
 * docNo + revision, status chain, supersede support.
 */

export async function listDocuments(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "document", "read");

  return db.projectDocument.findMany({
    where: { projectId },
    orderBy: [{ docNo: "asc" }, { revisionNo: "desc" }],
    take: 100,
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      issuedBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function createDocument(
  user: SessionUser,
  projectId: string,
  input: CreateDocumentInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "document", "create");

  if (input.wbsNodeId) {
    const wbs = await db.wbsNode.findFirst({
      where: { id: input.wbsNodeId, projectId },
    });
    if (!wbs) throw new Error("WBS node not found");
  }

  return db.projectDocument.create({
    data: {
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      docNo: input.docNo,
      title: input.title,
      category: input.category,
      revisionNo: input.revisionNo ?? 1,
      status: "DRAFT",
      filePath: input.filePath ?? null,
      issuedByUserId: user.id,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
    },
  });
}

/** DRAFT → UNDER_REVIEW → ISSUED (approve) · SUPERSEDED · WITHDRAWN */
export async function updateDocumentStatus(
  user: SessionUser,
  projectId: string,
  documentId: string,
  status: "DRAFT" | "UNDER_REVIEW" | "ISSUED" | "SUPERSEDED" | "WITHDRAWN"
) {
  await assertProjectAccess(user, projectId);

  const doc = await db.projectDocument.findFirst({
    where: { id: documentId, projectId },
  });
  if (!doc) throw new Error("Document not found");
  assertStatusTransition(doc.status, status, DOC_TRANSITIONS, "Document status");

  if (status === "ISSUED") {
    assertPermission(user, "document", "approve");
    return db.projectDocument.update({
      where: { id: documentId },
      data: { status: "ISSUED", approvedById: user.id },
    });
  }

  assertPermission(user, "document", "update");
  return db.projectDocument.update({
    where: { id: documentId },
    data: { status },
  });
}

/**
 * Walk the WBS ancestor chain (recursive CTE) and return all ISSUED documents
 * attached to any ancestor node. Optionally filter by document category.
 * Respects scope: only returns documents from nodes the user can access.
 */
export async function getInheritedDocuments(
  user: SessionUser,
  wbsNodeId: string,
  category?: string
): Promise<
  Array<{
    id: string;
    docNo: string;
    title: string;
    category: string;
    revisionNo: number;
    status: string;
    filePath: string | null;
  }>
> {
  const node = await db.wbsNode.findUnique({
    where: { id: wbsNodeId },
    select: { projectId: true },
  });
  if (!node) throw new Error("WBS node not found");
  await assertProjectAccess(user, node.projectId);
  assertPermission(user, "document", "read");

  const categoryFilter = category ? `AND pd.category = '${category}'` : "";
  const rows = await db.$queryRawUnsafe<
    Array<{
      id: string;
      doc_no: string;
      title: string;
      category: string;
      revision_no: number;
      status: string;
      file_path: string | null;
    }>
  >(
    `WITH RECURSIVE wbs_ancestors AS (
       SELECT id, parent_id FROM "WBSNode" WHERE id = $1
       UNION ALL
       SELECT w.id, w.parent_id FROM "WBSNode" w
       INNER JOIN wbs_ancestors wa ON w.id = wa.parent_id
     )
     SELECT pd.id, pd.doc_no, pd.title, pd.category, pd.revision_no, pd.status, pd.file_path
     FROM "ProjectDocument" pd
     INNER JOIN wbs_ancestors wa ON pd.wbs_node_id = wa.id
     WHERE pd.status = 'ISSUED' ${categoryFilter}
     ORDER BY pd.category, pd.revision_no DESC`,
    wbsNodeId
  );

  return rows.map((r) => ({
    id: r.id,
    docNo: r.doc_no,
    title: r.title,
    category: r.category,
    revisionNo: r.revision_no,
    status: r.status,
    filePath: r.file_path,
  }));
}

/**
 * List documents scoped to a specific WBS node and its descendants.
 * Used for subcontractor scope isolation — only shows documents within their contracted subtree.
 */
export async function listDocumentsInScope(
  user: SessionUser,
  projectId: string,
  wbsNodeId: string
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "document", "read");

  const descendantIds = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `WITH RECURSIVE wbs_descendants AS (
       SELECT id, parent_id FROM "WBSNode" WHERE id = $1
       UNION ALL
       SELECT w.id, w.parent_id FROM "WBSNode" w
       INNER JOIN wbs_descendants wd ON w.parent_id = wd.id
     )
     SELECT id FROM wbs_descendants`,
    wbsNodeId
  );

  return db.projectDocument.findMany({
    where: {
      projectId,
      wbsNodeId: { in: descendantIds.map((d) => d.id) },
    },
    orderBy: [{ docNo: "asc" }, { revisionNo: "desc" }],
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      issuedBy: { select: { id: true, fullName: true } },
    },
  });
}
