import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// Endpoints que deben quedar accesibles sin sesión (si no, nadie podría
// loguearse ni ver el formulario de login).
const PUBLIC_PATHS = [
  "/admin/login",
  "/api/admin/login",
  "/api/admin/discord/login",
  "/api/admin/discord/callback",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    // Las llamadas de API (fetch/fetch con FormData) reciben un 401 en vez
    // de un redirect HTML, para que el cliente pueda mostrar un error claro.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
