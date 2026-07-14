import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Ingresar al panel admin",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";
  const from = params.from ?? "/admin";

  return (
    <div className="flex min-h-[calc(100vh-4rem-5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg shadow-black/20">
        <h1 className="text-xl font-bold text-foreground">Panel admin</h1>
        <p className="mt-1 text-sm text-muted">{siteConfig.shortName}</p>

        {hasError && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            Usuario o contraseña incorrectos.
          </p>
        )}

        <form action="/api/admin/login" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="from" value={from} />

          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-muted">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoFocus
              className="w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-foreground outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
