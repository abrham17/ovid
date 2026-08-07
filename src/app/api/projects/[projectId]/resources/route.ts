import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listResources,
  createEmployee,
  createAssignment,
  createAttendance,
  createEquipment,
  createUsageLog,
} from "@/lib/services/resources.service";
import {
  createEmployeeSchema,
  createAssignmentSchema,
  createAttendanceSchema,
  createEquipmentSchema,
  createUsageLogSchema,
} from "@/lib/validations/resources";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listResources(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("employee"), data: createEmployeeSchema }),
  z.object({ kind: z.literal("assignment"), data: createAssignmentSchema }),
  z.object({ kind: z.literal("attendance"), data: createAttendanceSchema }),
  z.object({ kind: z.literal("equipment"), data: createEquipmentSchema }),
  z.object({ kind: z.literal("usage"), data: createUsageLogSchema }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));

    switch (parsed.kind) {
      case "employee":
        return created(await createEmployee(user, projectId, parsed.data));
      case "assignment":
        return created(await createAssignment(user, projectId, parsed.data));
      case "attendance":
        return created(await createAttendance(user, projectId, parsed.data));
      case "equipment":
        return created(await createEquipment(user, projectId, parsed.data));
      case "usage":
        return created(await createUsageLog(user, projectId, parsed.data));
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
