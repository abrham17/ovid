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
    // Fail-closed security rule: deny unmapped route methods
    throw new Error(`Unauthorized route method ${method} ${routePattern}`);
  }

  assertPermission(
    user,
    permissionRule.resource as any,
    permissionRule.action as any
  );
}
