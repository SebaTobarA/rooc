"use client";

import { useState, useTransition } from "react";
import { updateMyJobClass } from "@/lib/actions/profile";

export function ClassEditor({
  jobRoles,
  currentRoleId,
}: {
  jobRoles: { id: string; name: string }[];
  currentRoleId: string | null;
}) {
  const [selected, setSelected] = useState(currentRoleId ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function handleSave() {
    if (!selected || selected === currentRoleId) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateMyJobClass(selected);
      if (result.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "ok", text: "Clase actualizada — también se sincronizó en Discord." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="job-class-select" className="text-xs uppercase tracking-wide text-muted">
        Clase (Job)
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id="job-class-select"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setFeedback(null);
          }}
          className="rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          <option value="" disabled>
            Elige tu clase
          </option>
          {jobRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !selected || selected === currentRoleId}
          className="btn-brand px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {feedback && (
        <p className={`text-xs ${feedback.type === "ok" ? "text-accent" : "text-secondary"}`}>
          {feedback.text}
        </p>
      )}
      <p className="text-xs text-muted">
        Esto está vinculado con Discord: cambiarla aquí actualiza tu rol en el server, y si cambias
        tu rol de clase directamente en Discord, se refleja aquí al volver a entrar a esta página.
      </p>
    </div>
  );
}
