"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { inputClass } from "@/components/forms/form-fields";
import { IMPORT_ENTITIES, getImportEntity } from "@/lib/import/formats";

type ImportSummary = { created: number; updated: number; errors: string[] };
type ApiResponse =
  | { ok: true; rowCount: number; summary: ImportSummary }
  | { error: string };

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportForm() {
  const router = useRouter();
  const [entity, setEntity] = useState<string>(IMPORT_ENTITIES[0].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const entityDef = useMemo(() => getImportEntity(entity), [entity]);

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

  function downloadCsvTemplate() {
    if (!entityDef) return;
    const header = entityDef.fields.map((field) => field.name).join(",");
    downloadTextFile(`plantilla-${entityDef.value}.csv`, `${header}\n`, "text/csv");
  }

  function downloadJsonTemplate() {
    if (!entityDef) return;
    const example = Object.fromEntries(entityDef.fields.map((field) => [field.name, ""]));
    downloadTextFile(
      `plantilla-${entityDef.value}.json`,
      JSON.stringify([example], null, 2),
      "application/json"
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid max-w-2xl gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Tabla a importar</span>
          <select
            name="entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className={inputClass}
          >
            {IMPORT_ENTITIES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        {entityDef && (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            <p className="font-medium text-foreground">
              Formato esperado — {entityDef.label} (columnas):
            </p>
            <ul className="mt-2 space-y-1.5">
              {entityDef.fields.map((field) => (
                <li key={field.name}>
                  <code className="rounded bg-background-elevated px-1 py-0.5 text-foreground">
                    {field.name}
                  </code>{" "}
                  {field.required ? (
                    <span className="text-accent">obligatoria</span>
                  ) : (
                    <span>opcional</span>
                  )}
                  {field.hint && <span> — {field.hint}</span>}
                </li>
              ))}
            </ul>
            {entityDef.notes && <p className="mt-2">{entityDef.notes}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
              >
                Descargar plantilla CSV vacía
              </button>
              <button
                type="button"
                onClick={downloadJsonTemplate}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
              >
                Descargar plantilla JSON vacía
              </button>
            </div>
          </div>
        )}

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
        <div className="mt-6 max-w-2xl rounded-xl border border-border bg-surface p-4 text-sm">
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
