import "../globals.css";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session?.discordId
    ? await prisma.user.findUnique({ where: { discordId: session.discordId } })
    : null;

  const sidebarSession = session
    ? {
        label: user?.globalName ?? user?.username ?? session.username ?? "Cuenta",
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
