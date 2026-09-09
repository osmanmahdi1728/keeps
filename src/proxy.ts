import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/program", "/stamp", "/customers", "/campaigns", "/onboarding", "/website"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/program/:path*", "/stamp/:path*", "/customers/:path*", "/campaigns/:path*", "/onboarding/:path*", "/website/:path*"],
};
