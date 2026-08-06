import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth actions themselves must always pass through.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Public invitation acceptance (token in path).
  if (pathname.startsWith("/invite/")) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.get(name));

  if (!hasSession && pathname !== "/login") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all request paths except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)"],
};
