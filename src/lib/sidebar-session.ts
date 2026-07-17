import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRolesCached } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import type { SidebarSession } from "@/components/site-sidebar";

/**
 * Arma los datos que necesita <SiteSidebar> (avatar, nombre, clase,
 * isAdmin) a partir de la sesión actual — usado tanto por el layout del
 * panel como por el de admin, para que ambos compartan el mismo shell.
 */
export async function getSidebarSession(): Promise<SidebarSession | null> {
  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;

  // El bot puede fallar (token/guild mal configurados, rate limit, etc.) sin
  // que eso rompa la carga del panel — en ese caso simplemente no se muestra
  // la clase en la tarjeta de perfil.
  let job: string | null = null;
  if (user) {
    try {
      const guildRoles = await getGuildRolesCached();
      job = resolveJobFromRoles(user.roles, guildRoles);
    } catch {
      job = null;
    }
  }

  if (!session) return null;

  return {
    label: user?.globalName ?? user?.username ?? session.username ?? "Cuenta",
    username: user?.username ?? null,
    avatarUrl: user ? discordAvatarUrl(user.discordId, user.avatarHash) : null,
    job,
    isAdmin: session.isAdmin,
  };
}
