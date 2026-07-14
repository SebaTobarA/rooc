import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Ingresar al panel admin",
};

const ERROR_MESSAGES: Record<string, string> = {
  "1": "Usuario o contraseña incorrectos.",
  discord_not_allowed: "Esa cuenta de Discord no tiene acceso al panel admin.",
  discord_invalid: "No se pudo completar el inicio de sesión con Discord. Probá de nuevo.",
  discord_failed: "Hubo un error al conectar con Discord. Probá de nuevo.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;
  const from = params.from ?? "/admin";

  return (
    <div className="flex min-h-[calc(100vh-4rem-5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-lg shadow-black/20">
        <h1 className="text-xl font-bold text-foreground">Panel admin</h1>
        <p className="mt-1 text-sm text-muted">{siteConfig.shortName}</p>

        {errorMessage && (
          <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {errorMessage}
          </p>
        )}

        <a
          href={`/api/admin/discord/login?from=${encodeURIComponent(from)}`}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-3 py-2 font-medium text-white transition-colors hover:bg-[#4752c4]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.21.375-.444.875-.608 1.269a18.27 18.27 0 0 0-5.556 0A12.76 12.76 0 0 0 9.115 3a19.736 19.736 0 0 0-4.435 1.372C1.5 8.845.755 13.2 1.128 17.5a19.9 19.9 0 0 0 6.03 3.048c.487-.657.92-1.354 1.293-2.087a12.9 12.9 0 0 1-2.037-.98c.171-.124.339-.253.5-.386 3.927 1.8 8.18 1.8 12.061 0 .163.133.331.262.5.386-.646.386-1.332.71-2.04.981.374.733.806 1.43 1.293 2.086a19.83 19.83 0 0 0 6.032-3.047c.44-4.993-.762-9.309-3.443-13.132ZM8.02 14.84c-1.182 0-2.153-1.077-2.153-2.396 0-1.319.951-2.397 2.153-2.397 1.203 0 2.174 1.078 2.153 2.397 0 1.319-.95 2.396-2.153 2.396Zm7.96 0c-1.182 0-2.153-1.077-2.153-2.396 0-1.319.95-2.397 2.153-2.397 1.203 0 2.174 1.078 2.153 2.397 0 1.319-.95 2.396-2.153 2.396Z" />
          </svg>
          Iniciar sesión con Discord
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          o con usuario y contraseña
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action="/api/admin/login" method="POST" className="space-y-4">
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

          <button type="submit" className="btn-brand w-full px-3 py-2">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
