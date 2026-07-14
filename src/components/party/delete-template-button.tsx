"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deletePartyTemplate } from "@/lib/actions/party-templates";

export function DeleteTemplateButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm composition-remove-btn"
      disabled={isPending}
      aria-label="Eliminar plantilla"
      onClick={() => {
        if (!window.confirm("¿Eliminar esta plantilla?")) return;
        startTransition(() => {
          deletePartyTemplate(id);
        });
      }}
    >
      <X size={12} />
    </button>
  );
}
