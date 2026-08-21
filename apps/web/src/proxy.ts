import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/", "/sign-in"]);

export function proxy(request: NextRequest) {
  if (publicPaths.has(request.nextUrl.pathname) || request.cookies.has("yappa_session")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export const config = { matcher: ["/((?!_next|favicon.ico|icon.svg|demos|images).*)"] };
