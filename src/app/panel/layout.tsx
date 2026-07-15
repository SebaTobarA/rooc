import "../globals.css";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRolesCached } from "@/lib/discord-bot";
import { resolveJobFromRoles } from "@/lib/discord-job-roles";
import { discordAvatarUrl } from "@/lib/discord-avatar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
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

  const sidebarSession = session
    ? {
        label: user?.globalName ?? user?.username ?? session.username ?? "Cuenta",
        username: user?.username ?? null,
        avatarUrl: user ? discordAvatarUrl(user.discordId, user.avatarHash) : null,
        job,
        isAdmin: session.isAdmin,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <SiteSidebar session={sidebarSession} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
