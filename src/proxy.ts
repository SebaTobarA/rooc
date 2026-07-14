import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/panel/:path*"],
};

// Endpoints que deben quedar accesibles sin sesión (si no, nadie podría
// loguearse ni ver el formulario de login).
const PUBLIC_PATHS = [
  "/admin/login",
  "/api/admin/login",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!session?.isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // /panel/*: cualquier sesión válida (miembro del server que inició sesión
  // con Discord) alcanza. Sin sesión, va directo al login de Discord en vez
  // de a una página intermedia — la web de marketing ya tiene el botón de
  // login en el header para quien llegue por su cuenta.
  if (!session) {
    const loginUrl = new URL("/api/auth/discord/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
