"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty } from "@/lib/rbac";
import { canInviteUsers, canInviteRole } from "@/lib/rbac/invitations";
import { createInviteToken, hashInviteToken, inviteExpiresAt } from "@/lib/invitations/token";
import { buildInviteUrl } from "@/lib/email/invite-url";
import { sendInvitationEmail } from "@/lib/email/client";
import { audit } from "@/lib/audit";
import { ok, fail, runAction, type ActionResult } from "@/lib/action-result";

const USER_ROLES = [
  "FOREMAN",
  "SUPERINTENDENT",
  "SITE_ENGINEER",
  "DEPUTY_PM",
  "SENIOR_PM",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "QS",
  "PROCUREMENT",
  "FINANCE",
  "HR",
  "EQUIPMENT_MANAGER",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "ADMIN",
] as const;

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  jobTitle: z.string().min(1),
  role: z.enum(USER_ROLES),
  phone: z.string().optional(),
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  projectRole: z.string().optional(),
});

const acceptSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export async function inviteUser(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!canInviteUsers(user.role)) {
      return fail("Your role cannot send invitations.");
    }

    const parsed = inviteSchema.parse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      jobTitle: formData.get("jobTitle"),
      role: formData.get("role"),
      phone: formData.get("phone") || undefined,
      organizationId: formData.get("organizationId") || undefined,
      projectId: formData.get("projectId") || undefined,
      projectRole: formData.get("projectRole") || undefined,
    });

    if (!canInviteRole(user.role, parsed.role)) {
      return fail("You are not allowed to invite someone with that role.");
    }

    const organizationId =
      user.role === "ADMIN" && parsed.organizationId
        ? parsed.organizationId
        : user.organizationId;

    if (user.role !== "ADMIN" && organizationId !== user.organizationId) {
      return fail("You can only invite users to your own organization.");
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) return fail("Organization not found.");

    const existingUser = await db.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
      select: { id: true, active: true },
    });
    if (existingUser?.active) {
      return fail("An active user with this email already exists.");
    }

    let projectId: string | undefined;
    let projectRole: string | undefined;
    if (parsed.projectId) {
      const party = await getProjectParty(user, parsed.projectId);
      if (!party && user.role !== "ADMIN") {
        return fail("You do not have access to that project.");
      }
      const project = await db.project.findUnique({
        where: { id: parsed.projectId },
        select: { id: true },
      });
      if (!project) return fail("Project not found.");
      projectId = project.id;
      projectRole = parsed.projectRole?.trim() || "Team member";
    }

    const { rawToken, tokenHash } = createInviteToken();
    const expiresAt = inviteExpiresAt();

    const invitation = await db.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: {
          email: parsed.email.toLowerCase(),
          organizationId,
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });

      return tx.invitation.create({
        data: {
          email: parsed.email.toLowerCase(),
          fullName: parsed.fullName,
          jobTitle: parsed.jobTitle,
          role: parsed.role,
          phone: parsed.phone,
          organizationId,
          invitedById: user.id,
          projectId,
          projectRole,
          tokenHash,
          expiresAt,
        },
      });
    });

    const inviteUrl = buildInviteUrl(rawToken);
    const inviter = await db.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    });

    try {
      await sendInvitationEmail({
        to: invitation.email,
        inviteeName: invitation.fullName,
        inviterName: inviter?.fullName ?? "A team lead",
        organizationName: organization.name,
        role: invitation.role,
        inviteUrl,
        expiresAt,
      });
    } catch (error) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: "REVOKED" },
      });
      throw error;
    }

    await audit({
      userId: user.id,
      entityType: "Invitation",
      entityId: invitation.id,
      action: "CREATE",
      diff: { email: invitation.email, role: invitation.role, organizationId },
    });

    revalidatePath("/team");
    const emailed = Boolean(process.env.RESEND_API_KEY?.trim());
    return ok(
      emailed
        ? `Invitation sent to ${invitation.email}.`
        : `Invitation created for ${invitation.email} (dev mode — check server logs for the link).`
    );
  });
}

export async function revokeInvitation(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!canInviteUsers(user.role)) {
      return fail("Your role cannot manage invitations.");
    }

    const invitationId = String(formData.get("invitationId") ?? "");
    if (!invitationId) return fail("Invitation id is required.");

    const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) return fail("Invitation not found.");
    if (user.role !== "ADMIN" && invitation.organizationId !== user.organizationId) {
      return fail("You can only revoke invitations for your organization.");
    }
    if (invitation.status !== "PENDING") {
      return fail("Only pending invitations can be revoked.");
    }

    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: "REVOKED" },
    });

    await audit({
      userId: user.id,
      entityType: "Invitation",
      entityId: invitation.id,
      action: "UPDATE",
      diff: { status: "REVOKED" },
    });

    revalidatePath("/team");
    return ok("Invitation revoked.");
  });
}

export async function resendInvitation(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    if (!canInviteUsers(user.role)) {
      return fail("Your role cannot manage invitations.");
    }

    const invitationId = String(formData.get("invitationId") ?? "");
    if (!invitationId) return fail("Invitation id is required.");

    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { fullName: true } },
      },
    });
    if (!invitation) return fail("Invitation not found.");
    if (user.role !== "ADMIN" && invitation.organizationId !== user.organizationId) {
      return fail("You can only resend invitations for your organization.");
    }
    if (invitation.status !== "PENDING" && invitation.status !== "EXPIRED") {
      return fail("Only pending or expired invitations can be resent.");
    }

    const { rawToken, tokenHash } = createInviteToken();
    const expiresAt = inviteExpiresAt();

    const updated = await db.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash,
        expiresAt,
        status: "PENDING",
      },
    });

    const inviteUrl = buildInviteUrl(rawToken);
    await sendInvitationEmail({
      to: updated.email,
      inviteeName: updated.fullName,
      inviterName: invitation.invitedBy.fullName,
      organizationName: invitation.organization.name,
      role: updated.role,
      inviteUrl,
      expiresAt,
    });

    await audit({
      userId: user.id,
      entityType: "Invitation",
      entityId: updated.id,
      action: "UPDATE",
      diff: { resent: true, expiresAt },
    });

    revalidatePath("/team");
    return ok(`Invitation resent to ${updated.email}.`);
  });
}

export async function acceptInvitation(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = acceptSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const tokenHash = hashInviteToken(parsed.token);
    const invitation = await db.invitation.findUnique({
      where: { tokenHash },
    });
    if (!invitation) return fail("Invitation not found.");
    if (invitation.status === "REVOKED") {
      return fail("This invitation was revoked.");
    }
    if (invitation.status === "ACCEPTED") {
      return fail("This invitation was already accepted.");
    }
    if (invitation.expiresAt.getTime() < Date.now() || invitation.status === "EXPIRED") {
      await db.invitation.updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      return fail("This invitation has expired.");
    }

    const existing = await db.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    if (existing) {
      return fail("An account with this email already exists. Sign in instead.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const createdUser = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          fullName: invitation.fullName,
          email: invitation.email,
          passwordHash,
          phone: invitation.phone,
          jobTitle: invitation.jobTitle,
          role: invitation.role,
          active: true,
        },
      });

      if (invitation.projectId) {
        await tx.projectMembership.create({
          data: {
            projectId: invitation.projectId,
            userId: newUser.id,
            organizationId: invitation.organizationId,
            projectRole: invitation.projectRole || "Team member",
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedUserId: newUser.id,
        },
      });

      return newUser;
    });

    await audit({
      userId: createdUser.id,
      entityType: "Invitation",
      entityId: invitation.id,
      action: "UPDATE",
      diff: { status: "ACCEPTED", userId: createdUser.id },
    });

    return ok("Account created. You can sign in now.");
  });
}
