import { AdminNav } from "@/components/admin-nav";

export const metadata = {
  title: {
    default: "Panel admin",
    template: "%s · Panel admin",
  },
};

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
