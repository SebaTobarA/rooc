"use client";

import { useState, type ChangeEvent } from "react";
import { inputClass } from "@/components/forms/form-fields";

export function ImageUploadField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen.");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={url} />

      {url && (
        <img
          src={url}
          alt=""
          className="h-20 w-20 rounded-md border border-border bg-background-elevated object-contain p-1"
        />
      )}

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background-elevated file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        {uploading && <span className="text-xs text-muted">Subiendo…</span>}
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted">
        <span>O pega una URL directamente</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={inputClass}
        />
      </label>

      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
