import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import {
  assertPermission,
  canInvite,
  PermissionError,
} from "@/lib/permissions";
import type { BulkInviteInput } from "@/lib/validations/invitation";
import { hashPassword } from "@/lib/auth";

function generateToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteResult = {
  email: string;
  status: "created" | "already_member" | "pending" | "added_to_project" | "error";
  invitationId?: string;
  /** Plain token — only returned once for shareable accept link */
  token?: string;
  message?: string;
};

/**
 * Create bulk invitations aligned to Invitation + ProjectMembership schema.
 * - Existing org user + project → add membership (no new invite)
 * - Existing pending invite → skip
 * - Otherwise create Invitation with tokenHash; return plain token once
 */
export async function createInvitations(
  user: SessionUser,
  input: BulkInviteInput
): Promise<InviteResult[]> {
  if (!canInvite(user.role)) {
    throw new PermissionError("Your role cannot invite users");
  }
  assertPermission(user, "invitation", "create");

  const results: InviteResult[] = [];
  const projectId = input.projectId ?? null;

  for (const inv of input.invitations) {
    const email = inv.email;
    const targetProjectId = inv.projectId ?? projectId;

    try {
      const existingUser = await db.user.findUnique({ where: { email } });

      // Already in same org
      if (existingUser && existingUser.organizationId === user.organizationId) {
        if (targetProjectId) {
          const membership = await db.projectMembership.findFirst({
            where: {
              projectId: targetProjectId,
              userId: existingUser.id,
              organizationId: user.organizationId,
            },
          });
          if (membership) {
            results.push({ email, status: "already_member" });
            continue;
          }
          await db.projectMembership.create({
            data: {
              projectId: targetProjectId,
              userId: existingUser.id,
              organizationId: user.organizationId,
              projectRole: inv.projectRole || inv.role,
            },
          });
          results.push({
            email,
            status: "added_to_project",
            message: "Existing user added to project",
          });
          continue;
        }
        results.push({ email, status: "already_member" });
        continue;
      }

      // Pending invite for same email + org
      const pending = await db.invitation.findFirst({
        where: {
          email,
          organizationId: user.organizationId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      });
      if (pending) {
        results.push({
          email,
          status: "pending",
          invitationId: pending.id,
          message: "Invitation already pending",
        });
        continue;
      }

      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await db.invitation.create({
        data: {
          email,
          fullName: inv.fullName,
          jobTitle: inv.jobTitle || inv.role,
          role: inv.role,
          phone: inv.phone ?? null,
          organizationId: user.organizationId,
          invitedById: user.id,
          projectId: targetProjectId,
          projectRole: inv.projectRole || inv.role,
          tokenHash,
          status: "PENDING",
          expiresAt,
        },
      });

      results.push({
        email,
        status: "created",
        invitationId: invitation.id,
        token,
      });
    } catch (err) {
      results.push({
        email,
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Accept invite: create/update User, create ProjectMembership, mark invitation ACCEPTED.
 */
export async function acceptInvitation(
  token: string,
  fullName: string,
  password: string
) {
  const tokenHash = hashToken(token);

  const invitation = await db.invitation.findFirst({
    where: {
      tokenHash,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: { organization: true },
  });

  if (!invitation) {
    throw new Error("Invitation not found or has expired");
  }

  const passwordHash = await hashPassword(password);

  const result = await db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          fullName,
          passwordHash,
          role: invitation.role,
          jobTitle: invitation.jobTitle,
          phone: invitation.phone,
          organizationId: invitation.organizationId,
          active: true,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          email: invitation.email,
          fullName,
          passwordHash,
          role: invitation.role,
          jobTitle: invitation.jobTitle,
          phone: invitation.phone,
          organizationId: invitation.organizationId,
          active: true,
        },
      });
    }

    if (invitation.projectId) {
      const existingMem = await tx.projectMembership.findFirst({
        where: {
          projectId: invitation.projectId,
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      });
      if (!existingMem) {
        await tx.projectMembership.create({
          data: {
            projectId: invitation.projectId,
            userId: user.id,
            organizationId: invitation.organizationId,
            projectRole: invitation.projectRole || invitation.role,
          },
        });
      }
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedUserId: user.id,
      },
    });

    return user;
  });

  return result;
}

export async function listInvitations(user: SessionUser, projectId?: string) {
  assertPermission(user, "invitation", "read");

  return db.invitation.findMany({
    where: {
      organizationId: user.organizationId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      invitedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function listProjectTeam(user: SessionUser, projectId: string) {
  assertPermission(user, "project", "read");

  return db.projectMembership.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          jobTitle: true,
          active: true,
        },
      },
      organization: {
        select: { id: true, name: true, partyType: true },
      },
    },
    orderBy: { user: { fullName: "asc" } },
  });
}

/** Peek invitation metadata without accepting (for accept-invite page). */
export async function getInvitationByToken(token: string) {
  const tokenHash = hashToken(token);
  return db.invitation.findFirst({
    where: {
      tokenHash,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      jobTitle: true,
      role: true,
      expiresAt: true,
      organization: { select: { name: true, partyType: true } },
      project: { select: { id: true, code: true, name: true } },
    },
  });
}

export async function revokeInvitation(user: SessionUser, invitationId: string) {
  assertPermission(user, "invitation", "delete");

  const inv = await db.invitation.findFirst({
    where: { id: invitationId, organizationId: user.organizationId },
  });
  if (!inv) throw new Error("Invitation not found");
  if (inv.status !== "PENDING") {
    throw new Error("Only pending invitations can be revoked");
  }

  return db.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });
}
