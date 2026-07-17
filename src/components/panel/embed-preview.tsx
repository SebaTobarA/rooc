import { JOB_ROLE_NAMES } from "@/lib/discord-job-roles";

/** Mockup visual (no llama a Discord) de cómo se ve un embed de evento — usado en el editor de templates. */
export function EmbedPreview({
  title,
  icon,
  embedColor,
}: {
  title: string;
  icon: string;
  embedColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background-elevated p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-muted">Vista previa</p>
      <div className="rounded-md bg-surface p-4" style={{ borderLeft: `4px solid ${embedColor}` }}>
        <p className="font-bold text-foreground">
          {icon ? `${icon} ` : ""}
          {title || "Título del evento"}
        </p>

        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-foreground">Event Info:</span>
          <br />
          📅 &lt; fecha del evento &gt;
          <br />
          🕐 &lt; inicio &gt; - &lt; fin &gt;
        </p>

        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-foreground">Description:</span>
          <br />
          &lt; descripción del evento &gt;
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {JOB_ROLE_NAMES.map((className) => (
            <div key={className}>
              <p className="text-sm font-semibold text-foreground">{className} (0)</p>
              <p className="text-xs text-muted">-</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
