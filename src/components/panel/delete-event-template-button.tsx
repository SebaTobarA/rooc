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
          if (!window.confirm("¿Eliminar este template?")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteEventTemplate(id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo eliminar.");
            }
          });
        }}
      >
        Eliminar
      </button>
      {error && <span className="text-xs text-secondary">{error}</span>}
    </div>
  );
}
