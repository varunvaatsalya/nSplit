import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/groups",
  "/profile",
  "/notifications",
];

const AUTH_PAGES = ["/login", "/signup"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("nsplit_session")?.value;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/login",
    "/signup",
  ],
};
