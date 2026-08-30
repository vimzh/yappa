import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/", "/pricing", "/hackathon-slides.html"]);

export function proxy(request: NextRequest) {
  if (publicPaths.has(request.nextUrl.pathname) || request.cookies.has("yappa_session")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/?auth=required", request.url));
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|icon.svg|demos|images).*)"] };
