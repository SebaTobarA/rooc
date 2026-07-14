import { getGuildMembers, getGuildRoles } from "@/lib/discord-bot";
import { BotErrorNotice } from "@/components/admin/bot-error-notice";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Miembros del server",
};

export default async function AdminMembersPage() {
  let members: Awaited<ReturnType<typeof getGuildMembers>> = [];
  let roleNameById = new Map<string, string>();
  let error: string | null = null;

  try {
    const [membersResult, roles] = await Promise.all([getGuildMembers(), getGuildRoles()]);
    members = membersResult;
    roleNameById = new Map(roles.map((role) => [role.id, role.name]));
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido";
  }

  if (error) {
    return <BotErrorNotice message={error} />;
  }

  const sorted = [...members].sort((a, b) =>
    (a.nick ?? a.user.global_name ?? a.user.username).localeCompare(
      b.nick ?? b.user.global_name ?? b.user.username
    )
  );

  return (
    <div>
      <p className="text-sm text-muted">
        {sorted.length} miembro(s) en el server de Special Delivery.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Usuario</th>
              <th className="px-4 py-2 font-medium">Apodo</th>
              <th className="px-4 py-2 font-medium">Roles</th>
              <th className="px-4 py-2 font-medium">Se unió</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((member) => (
              <tr key={member.user.id} className="hover:bg-surface/60">
                <td className="px-4 py-2 text-foreground">
                  {member.user.global_name ?? member.user.username}
                  <span className="ml-1 text-xs text-muted">@{member.user.username}</span>
                </td>
                <td className="px-4 py-2 text-muted">{member.nick ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {member.roles.length === 0 ? (
                      <span className="text-xs text-muted">Sin roles</span>
                    ) : (
                      member.roles.map((roleId) => (
                        <span
                          key={roleId}
                          className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                        >
                          {roleNameById.get(roleId) ?? roleId}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-muted">
                  {new Date(member.joined_at).toLocaleDateString("es")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
