import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export type EffectivePermissions = {
  canViewPanel: boolean;
  canViewParty: boolean;
  canManageParty: boolean;
  canManageContent: boolean;
};

const FULL_ACCESS: EffectivePermissions = {
  canViewPanel: true,
  canViewParty: true,
  canManageParty: true,
  canManageContent: true,
};

// Cualquier miembro autenticado del server que no tenga un rol configurado
// explícitamente en /admin/roles ve el panel y el party builder, pero no
// puede gestionar contenido ni publicar plantillas de party.
const DEFAULT_MEMBER_ACCESS: EffectivePermissions = {
  canViewPanel: true,
  canViewParty: true,
  canManageParty: false,
  canManageContent: false,
};

/**
 * Permisos efectivos de una sesión: el admin (isAdmin, ver ADMIN_DISCORD_IDS)
 * siempre tiene acceso total. Para el resto, es el OR de los permisos de
 * cada uno de sus roles de Discord — un rol sin fila guardada en
 * RolePermission usa los valores por defecto de arriba.
 */
export async function getEffectivePermissions(
  session: SessionPayload | null
): Promise<EffectivePermissions> {
  if (!session) {
    return { canViewPanel: false, canViewParty: false, canManageParty: false, canManageContent: false };
  }
  if (session.isAdmin) return FULL_ACCESS;
  if (session.roles.length === 0) return DEFAULT_MEMBER_ACCESS;

  const rows = await prisma.rolePermission.findMany({
    where: { discordRoleId: { in: session.roles } },
  });
  const rowByRole = new Map(rows.map((row) => [row.discordRoleId, row]));

  const effective: EffectivePermissions = {
    canViewPanel: false,
    canViewParty: false,
    canManageParty: false,
    canManageContent: false,
  };

  for (const roleId of session.roles) {
    const perms = rowByRole.get(roleId) ?? DEFAULT_MEMBER_ACCESS;
    effective.canViewPanel ||= perms.canViewPanel;
    effective.canViewParty ||= perms.canViewParty;
    effective.canManageParty ||= perms.canManageParty;
    effective.canManageContent ||= perms.canManageContent;
  }

  return effective;
}
