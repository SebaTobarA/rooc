/** Piezas reutilizables de estilo para los formularios del panel admin. */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="btn-brand px-4 py-2 text-sm">
      {children}
    </button>
  );
}
