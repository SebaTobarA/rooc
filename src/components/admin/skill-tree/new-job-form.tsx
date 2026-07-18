"use client";

import { useState, useTransition } from "react";
import { createJob } from "@/lib/actions/skill-tree";

export function NewJobForm({ parentId, label = "+ Agregar" }: { parentId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-border px-2 py-1 text-left text-xs text-muted hover:border-accent/60 hover:text-accent"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await createJob(formData);
          setName("");
          setOpen(false);
        });
      }}
      className="flex items-center gap-1"
    >
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <input
        autoFocus
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la clase"
        required
        className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md border border-accent/40 px-2 py-1 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
      >
        {isPending ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 text-xs text-muted hover:text-foreground"
      >
        ✕
      </button>
    </form>
  );
}
