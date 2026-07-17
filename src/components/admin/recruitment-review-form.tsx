"use client";

import { useState, useTransition } from "react";
import { reviewApplication } from "@/lib/actions/recruitment";

const WAITLIST_DEFAULT_NOTE =
  "Agradecemos tu interés, sin embargo actualmente estarás en lista de espera hasta que haya cupos. Mientras tanto sé parte del servidor de Discord y participa del contenido mientras se liberan espacios.";

export function RecruitmentReviewForm({ applicationId }: { applicationId: string }) {
  const [mode, setMode] = useState<"idle" | "waitlist">("idle");
  const [note, setNote] = useState(WAITLIST_DEFAULT_NOTE);
  const [isPending, startTransition] = useTransition();

  function submit(status: "APPROVED" | "WAITLISTED") {
    const formData = new FormData();
    formData.set("reviewNote", status === "WAITLISTED" ? note : "");
    startTransition(async () => {
      await reviewApplication(applicationId, status, formData);
      setMode("idle");
    });
  }

  if (mode === "waitlist") {
    return (
      <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-background-elevated p-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Mensaje para el postulante</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => submit("WAITLISTED")}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
          >
            {isPending ? "Enviando…" : "Confirmar lista de espera"}
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="text-xs text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => submit("APPROVED")}
        disabled={isPending}
        className="btn-brand px-3 py-1.5 text-xs"
      >
        Aprobar
      </button>
      <button
        type="button"
        onClick={() => setMode("waitlist")}
        disabled={isPending}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface"
      >
        Lista de espera
      </button>
    </div>
  );
}
