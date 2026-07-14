import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discordAvatarUrl } from "@/lib/discord-avatar";
import { DiscordIcon } from "@/components/marketing/discord-icon";
import { UserMenu } from "@/components/marketing/user-menu";

export async function AuthNav() {
  const session = await getSession();

  if (!session?.discordId) {
    return (
      <a href="/api/auth/discord/login" className="btn btn-discord btn-small">
        <DiscordIcon />
        <span>Iniciar sesión</span>
      </a>
    );
  }

  const user = await prisma.user.findUnique({ where: { discordId: session.discordId } });
  const label = user?.globalName ?? user?.username ?? "Mi cuenta";
  const avatarUrl = user ? discordAvatarUrl(user.discordId, user.avatarHash) : null;

  return <UserMenu label={label} avatarUrl={avatarUrl} isAdmin={session.isAdmin} />;
}
