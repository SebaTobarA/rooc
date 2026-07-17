import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getEffectivePermissions } from "@/lib/permissions";

const APPLICANT_FORM_PATH = "/panel/postulacion";

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
    if (session?.isAdmin) return NextResponse.next();

    // Carve-out: /admin/recruitment (y su API) es visible para Guild
    // Leader/Vice Guild Leader/Oficiales sin que necesiten ser admin del
    // sitio completo — el permiso se configura por rol en /admin/roles.
    const isRecruitmentPath =
      pathname.startsWith("/admin/recruitment") || pathname.startsWith("/api/admin/recruitment");
    if (isRecruitmentPath && session) {
      const permissions = await getEffectivePermissions(session);
      if (permissions.canManageRecruitment) return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
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

  // Roles marcados `isApplicantRole` (ej. Pronterian@s) sin acceso real al
  // panel quedan confinados al formulario de postulación — cualquier otra
  // ruta de /panel los rebota ahí.
  if (!pathname.startsWith(APPLICANT_FORM_PATH)) {
    const permissions = await getEffectivePermissions(session);
    if (permissions.isApplicantOnly) {
      return NextResponse.redirect(new URL(APPLICANT_FORM_PATH, request.url));
    }
  }

  return NextResponse.next();
}
