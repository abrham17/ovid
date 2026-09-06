import { SessionUser } from "@/lib/auth";
import { assertPermission } from "@/lib/permissions";
import routePermissions from "@/permissions/route-permissions.json";

type RouteKey = keyof typeof routePermissions.routes;

export function assertRoutePermission(
  user: SessionUser,
  method: string,
  routePattern: string
) {
  const routeKey = `${method.toUpperCase()} ${routePattern}` as RouteKey;
  const permissionRule = routePermissions.routes[routeKey];

  if (!permissionRule) {
    // Default fallback: allow if user session exists, or require basic read
    return;
  }

  assertPermission(
    user,
    permissionRule.resource as any,
    permissionRule.action as any
  );
}
