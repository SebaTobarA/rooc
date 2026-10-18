"use client";

import { useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

/**
 * Una captura de la ficha de candidato: miniatura (o hueco para subirla),
 * botón para reemplazarla o quitarla, y un input oculto con la URL que se
 * envía junto con el resto de la ficha.
 */
export function CandidateShotField({
  name,
  label,
  hint,
  defaultValue,
  index,
}: {
  name: string;
  label: string;
  hint: string;
  defaultValue: string;
  index: number;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/recruitment/upload", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la captura.");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la captura.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background-elevated p-2">
      <input type="hidden" name={name} value={url} />
      <p className="truncate text-xs font-semibold text-foreground">
        {index}. {label}
      </p>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface">
        {url ? (
          <>
            <a href={url} target="_blank" rel="noopener noreferrer" title={`Abrir «${label}» en tamaño completo`}>
              <img src={url} alt={label} className="h-full w-full object-cover" />
            </a>
            <button
              type="button"
              onClick={() => setUrl("")}
              aria-label={`Quitar la captura de ${label}`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-rose-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-muted hover:text-accent">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[11px]">{uploading ? "Subiendo…" : "Subir captura"}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} className="sr-only" disabled={uploading} />
          </label>
        )}
      </div>
      {url && (
        <label className="cursor-pointer text-center text-[11px] text-accent hover:underline">
          {uploading ? "Subiendo…" : "Reemplazar"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} className="sr-only" disabled={uploading} />
        </label>
      )}
      <p className="text-center text-[11px] text-muted">{hint}</p>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}
