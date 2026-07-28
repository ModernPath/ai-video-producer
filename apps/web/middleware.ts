// REQ-PLT-002 — the gate. Default closed: anything not in `isPublicPath` needs a session.
import { NextResponse } from "next/server";
import { isPublicPath } from "@avd/plt/access";
import { auth } from "./auth";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (req.auth) return NextResponse.next();

  // Bounce API calls with a 401 rather than an HTML redirect — a fetch that follows a 302 to the
  // sign-in page parses the page as JSON and reports a confusing syntax error instead of "logged out".
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL("/signin", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(url);
});

export const config = {
  // Everything except Next's own build output and static files. The public paths are decided in one
  // place (@avd/plt/access) rather than duplicated into this matcher — a second copy of that list is
  // exactly the drift CLAUDE.md §1.11 is about.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|mp3|woff2?)$).*)"],
};
