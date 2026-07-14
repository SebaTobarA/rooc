import Link from "next/link";
import { getSession } from "@/lib/auth";
import { DiscordIcon } from "@/components/marketing/discord-icon";

export async function AuthNav() {
  const session = await getSession();

  if (!session) {
    return (
      <a href="/api/auth/discord/login" className="btn btn-discord btn-small">
        <DiscordIcon />
        <span>Iniciar sesión</span>
      </a>
    );
  }

  return (
    <div className="header-auth">
      <Link href="/panel" className="btn btn-discord btn-small">
        Ir a mi panel
      </Link>
      {session.isAdmin && (
        <Link href="/admin" className="btn btn-discord btn-small">
          Panel de Admin
        </Link>
      )}
    </div>
  );
}
