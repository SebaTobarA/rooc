import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "@/lib/session";
import { getEffectivePermissions, revalidateAdmin, type EffectivePermissions } from "@/lib/permissions";

/**
 * Sesión del request actual. El `isAdmin` de la cookie se calculó al iniciar
 * sesión y dura 7 días, así que se revalida contra ADMIN_DISCORD_IDS y
 * AdminGrant: si a alguien le quitan el admin, lo pierde en el siguiente
 * request y no cuando vence la cookie. `cache` evita repetir la consulta
 * dentro de un mismo request.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  return session ? revalidateAdmin(session) : null;
});

/**
 * Guardas para server actions. Las server actions son endpoints POST
 * públicos: que un botón solo se muestre en una página de admin no impide
 * llamarlas directo, así que cada una tiene que verificar el permiso.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session?.isAdmin) throw new Error("Solo un admin puede hacer esto.");
  return session;
}

export async function requirePermission(
  permission: Exclude<keyof EffectivePermissions, "isApplicantOnly">
): Promise<SessionPayload> {
  const session = await getSession();
  const permissions = await getEffectivePermissions(session);
  if (!session || !permissions[permission]) throw new Error("Tu rol no tiene permiso para hacer esto.");
  return session;
}
