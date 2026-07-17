import { getGuildRoles, getGuildMembers, type DiscordGuildMember } from "@/lib/discord-bot";
import { getOwnerIds } from "@/lib/discord-auth";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { AdminGrantPicker } from "@/components/admin/admin-grant-picker";
import { RolePicker } from "@/components/admin/role-picker";
import { updateRolePermission, removeVisibleRole } from "@/lib/actions/role-permissions";
import { removeAdminGrant } from "@/lib/actions/admin-grants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roles y permisos",
};

// Roles que siempre aparecen en la lista, aunque no tengan fila guardada
// todavía — son los que importan para el flujo de guild/reclutamiento. El
// resto de los roles del server (clases, cosméticos, etc.) quedan ocultos
// por defecto y se agregan a mano con "+ Agregar rol".
const PINNED_ROLE_IDS = new Set([
  "1519123503801172028", // Guild Master
  "1519166851848868000", // Moderador
  "1519123551192612986", // Vice Guild Master
  "1520562599903891526", // [SD] Core
  "1519123629638418514", // Pronterian@s
]);

const KNOWN_ROLE_HINTS: Record<string, string> = {
  "1519123629638418514": "Pronterian@s: rol de ingreso al server. Activa \"Solo puede postular\" para mandarlos directo al formulario de reclutamiento.",
  "1520562599903891526": "[SD] Core: acceso al panel sin Administración de la guild. Deja \"Ver Party Builder\" y \"Gestionar eventos\" apagados.",
};

const PERMISSION_FIELDS = [
  { name: "canViewPanel", label: "Ver panel (ítems/cartas/monstruos/mapas)" },
  { name: "canViewParty", label: "Ver Party Builder" },
  { name: "canManageParty", label: "Gestionar eventos y plantillas de party" },
  { name: "canManageContent", label: "Gestionar contenido (CRUD admin)" },
  { name: "canManageRecruitment", label: "Gestionar reclutamiento (revisar postulaciones)" },
  { name: "isApplicantRole", label: "Solo puede postular (oculta todo lo demás)" },
] as const;

const DEFAULT_ON = new Set(["canViewPanel", "canViewParty"]);

function memberLabel(member: DiscordGuildMember): string {
  return member.nick ?? member.user.global_name ?? member.user.username;
}

export default async function AdminRolesPage() {
  let roles: Awaited<ReturnType<typeof getGuildRoles>> = [];
  let guildMembers: DiscordGuildMember[] = [];
  let error: string | null = null;

  try {
    [roles, guildMembers] = await Promise.all([getGuildRoles(), getGuildMembers()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  if (error) {
    return <BotErrorNotice message={error} />;
  }

  const [permissions, adminGrants] = await Promise.all([
    prisma.rolePermission.findMany({ where: { discordRoleId: { in: roles.map((r) => r.id) } } }),
    prisma.adminGrant.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const permissionByRoleId = new Map(permissions.map((p) => [p.discordRoleId, p]));

  const memberById = new Map(guildMembers.map((m) => [m.user.id, m]));
  const ownerIds = getOwnerIds();
  const grantedIds = new Set(adminGrants.map((a) => a.discordId));
  const pickerMembers = guildMembers.filter(
    (m) => !ownerIds.includes(m.user.id) && !grantedIds.has(m.user.id)
  );

  // Solo se listan los roles fijos y los que ya se hayan agregado a mano
  // (tienen fila guardada en RolePermission) — el resto queda en el picker
  // de "+ Agregar rol".
  const visibleRoles = roles.filter(
    (role) => PINNED_ROLE_IDS.has(role.id) || permissionByRoleId.has(role.id)
  );
  const hiddenRoles = roles.filter(
    (role) => !PINNED_ROLE_IDS.has(role.id) && !permissionByRoleId.has(role.id)
  );

  return (
    <div className="flex flex-col gap-10">
      {/* ============ ADMINISTRADORES ============ */}
      <section>
        <h2 className="text-lg font-bold text-foreground">Administradores del sitio</h2>
        <p className="mt-1 text-sm text-muted">
          Los dueños (definidos por variable de entorno) tienen admin permanente — nadie puede
          quitárselos desde aquí. Los admins que otorgues tienen los mismos permisos que tú,
          salvo tocar a los dueños.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {ownerIds.map((discordId) => {
            const member = memberById.get(discordId);
            const label = member ? memberLabel(member) : discordId;
            const avatar = member ? discordAvatarUrl(discordId, member.user.avatar, 40) : null;
            return (
              <div
                key={discordId}
                className="flex items-center gap-3 rounded-md border border-border bg-background-elevated px-3 py-2"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-muted">
                    {label.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-foreground">{label}</span>
                {member && <span className="text-xs text-muted">@{member.user.username}</span>}
                <span className="ml-auto shrink-0 rounded-full border border-focus/40 px-2.5 py-1 text-xs font-medium text-focus">
                  Dueño
                </span>
              </div>
            );
          })}

          {adminGrants.map((grant) => {
            const avatar = discordAvatarUrl(grant.discordId, grant.avatarHash, 40);
            return (
              <div
                key={grant.id}
                className="flex items-center gap-3 rounded-md border border-border bg-background-elevated px-3 py-2"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs text-muted">
                    {grant.username.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-foreground">@{grant.username}</span>
                <span className="ml-auto shrink-0 rounded-full border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent">
                  Admin
                </span>
                <form action={removeAdminGrant.bind(null, grant.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-accent"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <AdminGrantPicker members={pickerMembers} />
        </div>
      </section>

      {/* ============ ROLES Y PERMISOS ============ */}
      <section>
        <h2 className="text-lg font-bold text-foreground">Roles y permisos del panel</h2>
        <p className="mt-1 text-sm text-muted">
          Define qué puede ver o gestionar cada rol de Discord dentro del panel. Un usuario con
          varios roles obtiene el permiso más amplio entre todos ellos. Roles sin guardar
          todavía usan los valores por defecto marcados abajo. Solo se muestran aquí los roles
          de guild — el resto (clases, cosméticos, etc.) se agrega a mano con &quot;+ Agregar
          rol&quot;.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {visibleRoles.map((role) => {
            const saved = permissionByRoleId.get(role.id);
            const updateAction = updateRolePermission.bind(null, role.id, role.name);
            const hint = KNOWN_ROLE_HINTS[role.id];
            const pinned = PINNED_ROLE_IDS.has(role.id);

            return (
              <div key={role.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{role.name}</p>
                  {!pinned && (
                    <form action={removeVisibleRole.bind(null, role.id)}>
                      <button
                        type="submit"
                        className="text-xs text-muted hover:text-accent"
                      >
                        Quitar de la lista
                      </button>
                    </form>
                  )}
                </div>
                {hint && (
                  <p className="mt-1 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs text-accent">
                    {hint}
                  </p>
                )}
                <form action={updateAction}>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {PERMISSION_FIELDS.map((field) => (
                      <label key={field.name} className="flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          name={field.name}
                          defaultChecked={saved ? saved[field.name] : DEFAULT_ON.has(field.name)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="btn-brand mt-4 px-4 py-2 text-sm">
                    Guardar
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <RolePicker roles={hiddenRoles} />
        </div>
      </section>
    </div>
  );
}
