import { getGuildRoles } from "@/lib/discord-bot";
import { prisma } from "@/lib/prisma";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";
import { updateRolePermission } from "@/lib/actions/role-permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roles y permisos",
};

const PERMISSION_FIELDS = [
  { name: "canViewPanel", label: "Ver panel (ítems/monstruos/mapas)" },
  { name: "canViewParty", label: "Ver party builder" },
  { name: "canManageParty", label: "Gestionar plantillas de party" },
  { name: "canManageContent", label: "Gestionar contenido (CRUD admin)" },
] as const;

export default async function AdminRolesPage() {
  let roles: Awaited<ReturnType<typeof getGuildRoles>> = [];
  let error: string | null = null;

  try {
    roles = await getGuildRoles();
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  if (error) {
    return <BotErrorNotice message={error} />;
  }

  const permissions = await prisma.rolePermission.findMany({
    where: { discordRoleId: { in: roles.map((role) => role.id) } },
  });
  const permissionByRoleId = new Map(permissions.map((p) => [p.discordRoleId, p]));

  return (
    <div>
      <p className="text-sm text-muted">
        Definí qué puede ver o gestionar cada rol de Discord dentro del panel. Un usuario con
        varios roles obtiene el permiso más amplio entre todos ellos. Roles sin guardar todavía
        usan los valores por defecto marcados abajo.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {roles.map((role) => {
          const saved = permissionByRoleId.get(role.id);
          const updateAction = updateRolePermission.bind(null, role.id, role.name);

          return (
            <form
              key={role.id}
              action={updateAction}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <p className="font-semibold text-foreground">{role.name}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PERMISSION_FIELDS.map((field) => (
                  <label key={field.name} className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      name={field.name}
                      defaultChecked={saved ? saved[field.name] : field.name !== "canManageParty" && field.name !== "canManageContent"}
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
          );
        })}
      </div>
    </div>
  );
}
