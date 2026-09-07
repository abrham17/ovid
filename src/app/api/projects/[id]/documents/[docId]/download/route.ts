import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, handleApiError, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/permissions";
import { assertRoutePermission } from "@/lib/authorization";
import { recordAuditLog } from "@/lib/services/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const user = await requireSession();
    const { id: projectId, docId } = await params;

    await assertProjectAccess(user, projectId);
    assertRoutePermission(user, "GET", "/api/projects/:id/documents/:docId/download");

    const doc = await db.projectDocument.findFirst({
      where: { id: docId, projectId },
    });

    if (!doc || !doc.filePath) {
      return fail("Document file not found", 404);
    }

    // F-011 download audit trace
    await recordAuditLog({
      userId: user.id,
      entityType: "ProjectDocument",
      entityId: doc.id,
      action: "READ",
      after: { docNo: doc.docNo, title: doc.title, downloadedAt: new Date() },
      reason: "Document download requested",
      authority: user.role,
    });

    return ok({
      id: doc.id,
      docNo: doc.docNo,
      title: doc.title,
      category: doc.category,
      revisionNo: doc.revisionNo,
      status: doc.status,
      downloadUrl: doc.filePath,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
