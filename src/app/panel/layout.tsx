import "../globals.css";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { getSidebarSession } from "@/lib/sidebar-session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sidebarSession = await getSidebarSession();

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
