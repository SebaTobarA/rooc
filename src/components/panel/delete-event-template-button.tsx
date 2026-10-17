"use client";

import { useState, useTransition } from "react";
import { deleteEventTemplate } from "@/lib/actions/event-templates";

export function DeleteEventTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        className="text-xs text-muted hover:text-accent disabled:opacity-50"
        onClick={() => {
          if (
            !window.confirm(
              "¿Eliminar este template? Si ya tiene eventos creados, se archiva: deja de aparecer, pero sus eventos y asistencias se conservan."
            )
          )
            return;
          setError(null);
          startTransition(async () => {
            const result = await deleteEventTemplate(id);
            if (result.error) setError(result.error);
          });
        }}
      >
        Eliminar
      </button>
      {error && <span className="text-xs text-secondary">{error}</span>}
    </div>
  );
}
