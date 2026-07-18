import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = ["/login", "/register"];

/**
 * Route protection at the edge. The actual token lives in Zustand's
 * persisted store (localStorage), which middleware can't read directly —
 * so we mirror its presence into a lightweight, non-sensitive cookie
 * (`hms_session=1`) whenever a session is set/cleared (see auth.store.ts).
 * This middleware only makes a coarse redirect decision; every protected
 * page and API call still independently verifies the JWT.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.get("hms_session")?.value === "1";
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
