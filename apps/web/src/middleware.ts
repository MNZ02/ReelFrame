import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = ["/create", "/library", "/credits", "/characters", "/generations"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  // Optimistic check only (cookie presence, not signature/DB verified) — the
  // API still enforces real auth on every request. Good enough to gate page
  // access and avoid a flash of protected UI for logged-out visitors.
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create/:path*", "/library/:path*", "/credits/:path*", "/characters/:path*", "/generations/:path*"],
};
