import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { getSidebarSession } from "@/lib/sidebar-session";

export const metadata = {
  title: {
    default: "Panel admin",
    template: "%s · Panel admin",
  },
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const sidebarSession = await getSidebarSession();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <SiteSidebar session={sidebarSession} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              <Link href="/panel" className="mb-4 inline-block text-xs text-muted hover:text-foreground">
                ← Volver al panel
              </Link>
              <AdminNav />
              <div className="mt-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
