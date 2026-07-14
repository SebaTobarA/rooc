import Link from "next/link";

/**
 * Formulario de filtros genérico. Envía por GET (funciona sin JS) hacia el
 * mismo path, agregando los campos como query params. `basePath` se usa para
 * el link de "Limpiar filtros".
 */
export function FilterForm({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <form
      method="GET"
      className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      {children}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          Filtrar
        </button>
        <Link
          href={basePath}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

export function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export const filterInputClass =
  "rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
