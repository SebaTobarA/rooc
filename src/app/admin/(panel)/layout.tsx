import { AdminNav } from "@/components/admin-nav";
import { SiteSidebar } from "@/components/site-sidebar";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: {
    default: "Panel admin",
    template: "%s · Panel admin",
  },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        <SiteSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-foreground">Panel admin</h1>
                <form action="/api/admin/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
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
