import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

/**
 * true si el discordId fue otorgado como admin desde /admin/roles
 * (AdminGrant). No confundir con isOwnerId (src/lib/discord-auth.ts), que
 * es la lista fija por env var — un admin otorgado por DB puede ser
 * revocado por cualquier otro admin, el dueño no.
 */
export async function isDbGrantedAdmin(discordId: string): Promise<boolean> {
  const grant = await prisma.adminGrant.findUnique({ where: { discordId } });
  return grant !== null;
}

export type EffectivePermissions = {
  canViewPanel: boolean;
  canViewParty: boolean;
  canManageParty: boolean;
  canManageContent: boolean;
  canManageRecruitment: boolean;
  // true cuando el usuario no tiene acceso real al panel (canViewPanel en
  // false) pero al menos uno de sus roles está marcado `isApplicantRole` en
  // /admin/roles — se lo redirige a /panel/postulacion en vez de dejarlo
  // entrar al resto del panel (ver proxy.ts).
  isApplicantOnly: boolean;
};

const FULL_ACCESS: EffectivePermissions = {
  canViewPanel: true,
  canViewParty: true,
  canManageParty: true,
  canManageContent: true,
  canManageRecruitment: true,
  isApplicantOnly: false,
};

// Mismas banderas que guarda una fila de RolePermission (menos los campos
// de identidad) — usado como fallback para roles sin fila guardada, tanto
// en el atajo de "sin roles" como en el loop de abajo.
type RoleFlags = {
  canViewPanel: boolean;
  canViewParty: boolean;
  canManageParty: boolean;
  canManageContent: boolean;
  canManageRecruitment: boolean;
  isApplicantRole: boolean;
};

// Cualquier miembro autenticado del server que no tenga un rol configurado
// explícitamente en /admin/roles ve el panel y el party builder, pero no
// puede gestionar contenido ni publicar plantillas de party.
const DEFAULT_MEMBER_ACCESS: RoleFlags = {
  canViewPanel: true,
  canViewParty: true,
  canManageParty: false,
  canManageContent: false,
  canManageRecruitment: false,
  isApplicantRole: false,
};

/**
 * Permisos efectivos de una sesión: el admin (isAdmin, ver ADMIN_DISCORD_IDS
 * y AdminGrant) siempre tiene acceso total. Para el resto, es el OR de los
 * permisos de cada uno de sus roles de Discord — un rol sin fila guardada en
 * RolePermission usa los valores por defecto de arriba.
 */
export async function getEffectivePermissions(
  session: SessionPayload | null
): Promise<EffectivePermissions> {
  if (!session) {
    return {
      canViewPanel: false,
      canViewParty: false,
      canManageParty: false,
      canManageContent: false,
      canManageRecruitment: false,
      isApplicantOnly: false,
    };
  }
  if (session.isAdmin) return FULL_ACCESS;
  if (session.roles.length === 0) {
    return {
      canViewPanel: DEFAULT_MEMBER_ACCESS.canViewPanel,
      canViewParty: DEFAULT_MEMBER_ACCESS.canViewParty,
      canManageParty: DEFAULT_MEMBER_ACCESS.canManageParty,
      canManageContent: DEFAULT_MEMBER_ACCESS.canManageContent,
      canManageRecruitment: DEFAULT_MEMBER_ACCESS.canManageRecruitment,
      isApplicantOnly: false,
    };
  }

  const rows = await prisma.rolePermission.findMany({
    where: { discordRoleId: { in: session.roles } },
  });
  const rowByRole = new Map(rows.map((row) => [row.discordRoleId, row]));

  const effective: EffectivePermissions = {
    canViewPanel: false,
    canViewParty: false,
    canManageParty: false,
    canManageContent: false,
    canManageRecruitment: false,
    isApplicantOnly: false,
  };

  for (const roleId of session.roles) {
    const perms = rowByRole.get(roleId) ?? DEFAULT_MEMBER_ACCESS;
    effective.canViewPanel ||= perms.canViewPanel;
    effective.canViewParty ||= perms.canViewParty;
    effective.canManageParty ||= perms.canManageParty;
    effective.canManageContent ||= perms.canManageContent;
    effective.canManageRecruitment ||= perms.canManageRecruitment;
    if (perms.isApplicantRole) effective.isApplicantOnly = true;
  }

  // Si terminó con acceso real al panel por cualquier otro rol, la marca de
  // "solo postulante" no aplica más.
  if (effective.canViewPanel) effective.isApplicantOnly = false;

  return effective;
}
