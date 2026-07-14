"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inputClass } from "@/components/forms/form-fields";

type ImportSummary = { created: number; updated: number; errors: string[] };
type ApiResponse =
  | { ok: true; rowCount: number; summary: ImportSummary }
  | { error: string };

const ENTITIES = [
  { value: "items", label: "Ítems" },
  { value: "monsters", label: "Monstruos" },
  { value: "maps", label: "Mapas" },
  { value: "drops", label: "Drops" },
] as const;

export function ImportForm() {
  const router = useRouter();
  const [entity, setEntity] = useState<string>("items");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data: ApiResponse = await response.json();
      setResult(data);
      if ("ok" in data && data.ok) {
        router.refresh();
      }
    } catch {
      setResult({ error: "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Tabla a importar</span>
          <select
            name="entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className={inputClass}
          >
            {ENTITIES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Archivo (.csv o .json)</span>
          <input type="file" name="file" accept=".csv,.json" required className={inputClass} />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Importando..." : "Importar"}
        </button>
      </form>

      {result && (
        <div className="mt-6 max-w-xl rounded-xl border border-border bg-surface p-4 text-sm">
          {"error" in result ? (
            <p className="text-accent">{result.error}</p>
          ) : (
            <>
              <p className="text-foreground">
                {result.rowCount} fila(s) procesadas — {result.summary.created} creada(s),{" "}
                {result.summary.updated} actualizada(s).
              </p>
              {result.summary.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-accent">{result.summary.errors.length} fila(s) con error:</p>
                  <ul className="mt-1 list-inside list-disc text-muted">
                    {result.summary.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
