"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { communicatePartyTemplate } from "@/lib/actions/party-templates";

export function CommunicateTemplateButton({
  id,
  alreadyCommunicated,
}: {
  id: string;
  alreadyCommunicated: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="communicate-template">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={isPending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              await communicatePartyTemplate(id);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo comunicar.");
            }
          });
        }}
      >
        <Send size={12} />
        {isPending ? "Comunicando…" : alreadyCommunicated ? "Reenviar" : "Comunicar partys"}
      </button>
      {error && <p className="campo-error">{error}</p>}
    </div>
  );
}
