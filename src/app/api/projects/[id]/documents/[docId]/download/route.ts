import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { assertProjectAccess, assertPermission } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId, docId } = await params;

    await assertProjectAccess(user, projectId);
    assertPermission(user, "document", "read");

    const doc = await db.projectDocument.findFirst({
      where: { id: docId, projectId },
    });

    if (!doc || !doc.filePath) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      docNo: doc.docNo,
      title: doc.title,
      category: doc.category,
      revisionNo: doc.revisionNo,
      status: doc.status,
      downloadUrl: doc.filePath,
    });
  } catch (err) {
    return apiError(err);
  }
}
