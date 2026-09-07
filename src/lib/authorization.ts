import { SessionUser } from "@/lib/auth";
import { assertPermission, Resource, PermissionAction } from "@/lib/permissions";
import routePermissions from "@/permissions/route-permissions.json";

type RouteKey = keyof typeof routePermissions.routes;

export function matchRoutePattern(method: string, pathname: string): string | null {
  const upperMethod = method.toUpperCase();
  const routes = Object.keys(routePermissions.routes);

  for (const key of routes) {
    const [routeMethod, pattern] = key.split(" ");
    if (routeMethod !== upperMethod || !pattern) continue;

    const regexPattern = "^" + pattern.replace(/:[a-zA-Z0-9_]+/g, "[^/]+") + "$";
    const regex = new RegExp(regexPattern);

    if (regex.test(pathname)) {
      return key;
    }
  }
  return null;
}

export function assertRoutePermission(
  user: SessionUser,
  method: string,
  pathnameOrPattern: string
) {
  const upperMethod = method.toUpperCase();
  let exactKey = `${upperMethod} ${pathnameOrPattern}` as RouteKey;
  let permissionRule = routePermissions.routes[exactKey];

  if (!permissionRule) {
    const matchedKey = matchRoutePattern(upperMethod, pathnameOrPattern);
    if (matchedKey) {
      permissionRule = routePermissions.routes[matchedKey as RouteKey];
    }
  }

  if (!permissionRule) {
    // Fail-closed security rule: deny unmapped route methods
    throw new Error(`Unauthorized route method ${method} ${pathnameOrPattern}`);
  }

  assertPermission(
    user,
    permissionRule.resource as Resource,
    permissionRule.action as PermissionAction
  );
}
