import type { SessionUser } from "@/lib/rbac";
import { roleLandingConfig } from "@/lib/rbac/dashboardRegistry";

/**
 * Resolves where to send a user immediately after login.
 * All roles land on the role dashboard (/dashboard); project overview is secondary.
 */
export async function getPostLoginPath(user: SessionUser): Promise<string> {
  const config = roleLandingConfig[user.role];

  if (config.type === "path") {
    return config.path;
  }

  return "/dashboard";
}
